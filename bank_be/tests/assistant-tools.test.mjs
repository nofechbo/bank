import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { createAssistantTools } from '../dist/services/assistant/assistantTools.service.js';
import { createAssistantModel } from '../dist/services/assistant/assistant.service.js';

const id = 'c099cb1e-ff98-4d30-8039-174f083e3a08';
const date = new Date('2026-09-01T12:00:00Z');
function fixture() {
  const calls = [];
  const row = { id, fromUserId: 'alice', amount: new Prisma.Decimal('0.10'), timeStamp: date,
    fromUser: { name: 'Alice' }, toUser: { name: 'Bob' } };
  const db = {
    user: { findFirst: async args => { calls.push(args); return { balance: new Prisma.Decimal('9007199254740993.01') }; } },
    bankTransaction: {
      findMany: async args => { calls.push(args); return [row]; },
      findFirst: async args => { calls.push(args); return null; },
      aggregate: async args => {
        calls.push(args);
        return { _sum: { amount: new Prisma.Decimal(args.where.fromUserId ? '0.1' : '0.3') }, _count: { _all: 1 } };
      },
    },
    $transaction: async (queries, options) => { assert.equal(options.isolationLevel, 'RepeatableRead'); return Promise.all(queries); },
  };
  return { db, calls, tools: createAssistantTools({ id: 'alice' }, db) };
}

test('balance stays exact and only selects authenticated account balance', async () => {
  const { calls, tools } = fixture();
  assert.deepEqual(JSON.parse(await tools[0].invoke({})), { balance: '9007199254740993.01' });
  assert.deepEqual(calls[0], { where: { id: 'alice', isVerified: true }, select: { balance: true } });
});

test('tools reject account overrides and invalid arguments before querying', async () => {
  const { tools, calls } = fixture();
  await assert.rejects(tools[0].invoke({ userId: 'bob' }));
  for (const limit of [0, -1, 21, 1.5, '5']) await assert.rejects(tools[1].invoke({ limit }));
  await assert.rejects(tools[2].invoke({ transactionId: 'not-a-uuid' }));
  await assert.rejects(tools[3].invoke({ start: 'yesterday', end: 'today' }));
  await assert.rejects(tools[3].invoke({ start: '2026-09-02T00:00:00Z', end: '2026-09-01T00:00:00Z' }));
  await assert.rejects(tools[3].invoke({ start: '2020-01-01T00:00:00Z', end: '2026-01-01T00:00:00Z' }));
  assert.equal(calls.length, 0);
});

test('recent transfers are scoped, bounded and expose only necessary fields', async () => {
  const { calls, tools } = fixture();
  const result = JSON.parse(await tools[1].invoke({}));
  assert.equal(calls[0].take, 5);
  assert.deepEqual(calls[0].where, { OR: [{ fromUserId: 'alice' }, { toUserId: 'alice' }] });
  assert.deepEqual(result.transactions, [{ id, direction: 'sent', counterpartyName: 'Bob', amount: '0.1', timestamp: date.toISOString() }]);
  assert.deepEqual(calls[0].select.fromUser, { select: { name: true } });
  const received = createAssistantTools({ id: 'bob' }, fixture().db);
  assert.equal(JSON.parse(await received[1].invoke({ limit: 2 })).transactions[0].direction, 'received');
});

test('transaction ID lookup includes ownership and returns null when inaccessible', async () => {
  const { calls, tools } = fixture();
  assert.deepEqual(JSON.parse(await tools[2].invoke({ transactionId: id })), { transaction: null });
  assert.deepEqual(calls[0].where, { id, OR: [{ fromUserId: 'alice' }, { toUserId: 'alice' }] });
});

test('summary aggregates exact decimals for authenticated user and exclusive end', async () => {
  const { calls, tools } = fixture();
  const result = JSON.parse(await tools[3].invoke({ start: '2026-09-01T00:00:00Z', end: '2026-09-08T00:00:00Z' }));
  assert.equal(result.net, '0.2');
  assert.deepEqual(result.sent, { total: '0.1', count: 1 });
  assert.deepEqual(result.received, { total: '0.3', count: 1 });
  assert.equal(calls[0].where.fromUserId, 'alice');
  assert.equal(calls[1].where.toUserId, 'alice');
  assert.deepEqual(calls[0].where.timeStamp, { gte: new Date(result.start), lt: new Date(result.end) });
});

test('empty data returns empty results/zero totals and missing balance fails', async () => {
  const { db } = fixture();
  db.user.findFirst = async () => null;
  db.bankTransaction.findMany = async () => [];
  db.bankTransaction.aggregate = async () => ({ _sum: { amount: null }, _count: { _all: 0 } });
  const tools = createAssistantTools({ id: 'alice' }, db);
  await assert.rejects(tools[0].invoke({}), /Account unavailable/);
  assert.deepEqual(JSON.parse(await tools[1].invoke({})), { transactions: [] });
  const result = JSON.parse(await tools[3].invoke({ start: '2026-09-01T00:00:00Z', end: '2026-09-08T00:00:00Z' }));
  assert.deepEqual(result.sent, { count: 0, total: '0' });
  assert.equal(result.net, '0');
});

test('model binds tools, parses calls without executing them, and does not retry errors', async () => {
  const oldKey = process.env.OPENROUTER_API_KEY;
  const oldModel = process.env.OPENROUTER_CHAT_MODEL;
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_CHAT_MODEL = 'openrouter/free';
  const { tools, calls } = fixture();
  let requests = 0;
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    requests++;
    const body = JSON.parse(options.body);
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(body.model, 'openrouter/free');
    assert.equal(body.tools.length, 4);
    assert.ok(options.signal);
    return new Response(JSON.stringify({ id: 'test', model: body.model, choices: [{ index: 0, finish_reason: 'tool_calls', message: {
      role: 'assistant', content: null, tool_calls: [{ id: 'call-test', type: 'function', function: { name: 'getMyBalance', arguments: '{}' } }],
    } }] }), { headers: { 'Content-Type': 'application/json' } });
  });
  try {
    const model = createAssistantModel(tools);
    const result = await model.invoke('Read my balance.');
    assert.equal(result.tool_calls[0].name, 'getMyBalance');
    assert.equal(calls.length, 0);
    fetchMock.mock.mockImplementation(async () => { requests++; return new Response('unavailable', { status: 503 }); });
    await assert.rejects(model.invoke('Read my balance.'));
    assert.equal(requests, 2);
  } finally {
    fetchMock.mock.restore();
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OPENROUTER_CHAT_MODEL; else process.env.OPENROUTER_CHAT_MODEL = oldModel;
  }
});
