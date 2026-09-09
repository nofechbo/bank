import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createChatLimiter, ChatLimitError } from '../dist/services/chatRateLimit.service.js';
import { authMiddleware } from '../dist/middleware/auth.middleware.js';
import { chatWithAssistant } from '../dist/controllers/assistant.controller.js';
import { ownedTransactionWhere } from '../dist/services/assistant/assistant.service.js';
import { dbInstance } from '../dist/db/prisma.js';
import { DEFAULT_CHAT_REQUESTS_PER_MINUTE as IP_LIMIT, CHAT_USER_REQUESTS_PER_MINUTE as USER_LIMIT, CHAT_MODEL_CALLS_PER_DAY as DAILY_LIMIT } from '../dist/utils/chatUtils/chat.consts.js';

// No database or provider calls: replace only the existing account/revocation reads.
const originalFindToken = dbInstance.revokedToken.findUnique;
const originalFindUser = dbInstance.user.findFirst;
process.env.JWT_SECRET = 'assistant-foundation-test-secret';

after(async () => {
  dbInstance.revokedToken.findUnique = originalFindToken;
  dbInstance.user.findFirst = originalFindUser;
  await dbInstance.$disconnect();
});

function response() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(key, value) { this.headers[key] = value; },
  };
}

test('public/private requests share IP limits; limits expire', () => {
  let now = 100_000;
  const limiter = createChatLimiter(() => now);
  limiter.reserveRequest('a');
  limiter.reserveRequest('a', 'user-a');
  limiter.reserveRequest('a', 'user-b');
  for (let i = 3; i < IP_LIMIT; i++) limiter.reserveRequest('a');
  assert.throws(() => limiter.reserveRequest('a'), ChatLimitError);
  now += 60_000;
  assert.doesNotThrow(() => limiter.reserveRequest('a'));
});

test('user limit spans IPs and rejected requests do not partially reserve', () => {
  const limiter = createChatLimiter();
  for (let i = 0; i < USER_LIMIT; i++) limiter.reserveRequest(`ip-${i}`, 'user-a');
  assert.throws(() => limiter.reserveRequest('c', 'user-a'), ChatLimitError);
  for (let i = 0; i < IP_LIMIT; i++) limiter.reserveRequest('c');
  assert.throws(() => limiter.reserveRequest('c'), ChatLimitError);
});

test('concurrent model reservations cannot exceed daily ceiling; UTC reset works', async () => {
  let now = Date.UTC(2026, 8, 8, 23, 59, 59);
  const limiter = createChatLimiter(() => now);
  const results = await Promise.allSettled(Array.from({ length: DAILY_LIMIT + 20 }, async () => limiter.reserveModelCall()));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, DAILY_LIMIT);
  assert.ok(results.filter(r => r.status === 'rejected').every(r => r.reason instanceof ChatLimitError));
  now += 1000;
  assert.doesNotThrow(() => limiter.reserveModelCall());
});

test('a fresh process limiter starts with a fresh daily allowance', () => {
  const limiter = createChatLimiter();
  for (let i = 0; i < DAILY_LIMIT; i++) limiter.reserveModelCall();
  assert.throws(() => limiter.reserveModelCall(), ChatLimitError);
  assert.doesNotThrow(() => createChatLimiter().reserveModelCall());
});

test('missing, expired, malformed and wrong-algorithm JWTs never reach account code', async () => {
  dbInstance.revokedToken.findUnique = async () => { throw new Error('unexpected database read'); };
  const tokens = [undefined, 'invalid',
    jwt.sign({ email: 'a@example.test' }, process.env.JWT_SECRET, { expiresIn: -1 }),
    jwt.sign({ email: 'a@example.test' }, process.env.JWT_SECRET),
    jwt.sign({ email: 42 }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    jwt.sign({ email: 'a@example.test' }, process.env.JWT_SECRET, { expiresIn: '1h', algorithm: 'HS384' }),
  ];
  for (const token of tokens) {
    const res = response();
    let nextCalled = false;
    await authMiddleware({ headers: token ? { authorization: `Bearer ${token}` } : {} }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  }
});

test('revoked JWT cannot reach assistant', async () => {
  dbInstance.revokedToken.findUnique = async () => ({ token: 'revoked' });
  const token = jwt.sign({ email: 'a@example.test' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const res = response();
  let called = false;
  await authMiddleware({ headers: { authorization: `Bearer ${token}` } }, res, () => { called = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
});

test('verified JWT alone determines account; body identities are ignored', async () => {
  dbInstance.revokedToken.findUnique = async () => null;
  let lookup;
  dbInstance.user.findFirst = async args => { lookup = args; return { id: 'account-a' }; };
  const token = jwt.sign({ email: 'a@example.test' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const req = { headers: { authorization: `Bearer ${token}` }, ip: 'identity-test',
    body: { message: 'My balance', email: 'victim@example.test', userId: 'victim' } };
  const res = response();
  let authorized = false;
  await authMiddleware(req, res, () => { authorized = true; });
  assert.equal(authorized, true);
  await chatWithAssistant(req, res);
  assert.deepEqual(lookup, { where: { email: 'a@example.test', isVerified: true }, select: { id: true } });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'ASSISTANT_NOT_READY');
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(ownedTransactionWhere({ id: 'account-a' }), { OR: [{ fromUserId: 'account-a' }, { toUserId: 'account-a' }] });
});

test('missing account is rejected; invalid messages and private request limits enforced', async () => {
  dbInstance.user.findFirst = async () => null;
  let res = response();
  const req = { user: { email: 'a@example.test' }, ip: 'validation-test', body: { message: '' } };
  await chatWithAssistant(req, res);
  assert.equal(res.statusCode, 403);
  dbInstance.user.findFirst = async () => ({ id: 'validation-account' });
  res = response();
  await chatWithAssistant(req, res);
  assert.equal(res.statusCode, 400);
  req.body.message = 'hello';
  await chatWithAssistant(req, response());
  for (let i = 2; i < USER_LIMIT; i++) await chatWithAssistant(req, response());
  res = response();
  await chatWithAssistant(req, res);
  assert.equal(res.statusCode, 429);
  assert.ok(res.headers['Retry-After'] > 0);
});
