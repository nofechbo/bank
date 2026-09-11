import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { Responses } from 'openai/resources/responses/responses';
import { dbInstance } from '../dist/db/prisma.js';
import { login } from '../dist/controllers/login.controller.js';
import { signup } from '../dist/controllers/signup.controller.js';
import { logout } from '../dist/controllers/logout.controller.js';
import { verifyEmail } from '../dist/controllers/verifyEmail.controller.js';
import { resendVerificationEmail } from '../dist/controllers/resendVerificationEmail.controller.js';
import { transfer } from '../dist/controllers/transfer.controller.js';
import { getDashboard } from '../dist/controllers/dashboard.controller.js';
import { startVideoCall } from '../dist/controllers/videoCall.controller.js';
import { DEFAULT_CHAT_REQUESTS_PER_MINUTE, TUNA_MASCOT_REPLY, SAFE_REPLY_FALLBACK } from '../dist/utils/chatUtils/chat.consts.js';

process.env.JWT_SECRET = 'controller-split-test-secret';
process.env.BREVO_API_KEY = 'brevo-test-key';
const restoreDatabaseMethods = [];
function replaceDatabaseMethod(target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  restoreDatabaseMethods.push(() => { target[name] = original; });
  return { mock: { mockImplementation(next) { target[name] = next; } } };
}
afterEach(() => {
  for (const restore of restoreDatabaseMethods.splice(0).reverse()) restore();
  mock.restoreAll();
});

function response() {
  return {
    statusCode: 200, body: undefined, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; },
  };
}

test('login keeps normalization, credential errors, and one-hour token response', async () => {
  let lookup;
  replaceDatabaseMethod(dbInstance.user, 'findUnique', async args => { lookup = args; return { email: 'a@example.test', password: 'hash', isVerified: true }; });
  const compare = mock.method(bcrypt, 'compare', async () => true);
  const res = response();
  await login({ body: { email: ' A@EXAMPLE.TEST ', password: 'password' } }, res);
  assert.deepEqual(lookup, { where: { email: 'a@example.test' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, 'Login successful');
  const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(payload.email, 'a@example.test');
  assert.equal(payload.exp - payload.iat, 3600);
  compare.mock.mockImplementation(async () => false);
  const denied = response();
  await login({ body: { email: 'a@example.test', password: 'wrong' } }, denied);
  assert.deepEqual(denied.body, { error: 'Invalid credentials' });
  assert.equal(denied.statusCode, 401);
});

test('signup keeps validation, hashing, account creation and verification email', async () => {
  mock.method(console, 'log', () => {});
  replaceDatabaseMethod(dbInstance.user, 'findUnique', async () => null);
  let created;
  replaceDatabaseMethod(dbInstance.user, 'create', async ({ data }) => { created = data; return data; });
  mock.method(bcrypt, 'hash', async (password, rounds) => { assert.equal(rounds, 10); return 'hashed-password'; });
  let mail;
  mock.method(globalThis, 'fetch', async (_url, options) => {
    mail = JSON.parse(options.body);
    return { ok: true };
  });
  const res = response();
  await signup({ body: { name: ' Alice ', email: ' A@EXAMPLE.TEST ', password: 'password', phone: '0501234567' } }, res);
  assert.deepEqual(created, { name: 'Alice', email: 'a@example.test', password: 'hashed-password', phone: '0501234567', balance: 0, isVerified: false });
  assert.equal(mail.to[0].email, 'a@example.test');
  assert.deepEqual(res.body, { message: 'Verification link sent', validForMinutes: 15 });
  assert.equal(res.statusCode, 200);
  const invalid = response();
  await signup({ body: { name: '', email: 'a@example.test', password: 'password', phone: '0501234567' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.body, { error: 'Name cannot be empty' });
});

test('logout stores the supplied bearer token and returns the same response', async () => {
  let record;
  replaceDatabaseMethod(dbInstance.revokedToken, 'create', async args => { record = args; });
  const res = response();
  await logout({ headers: { authorization: 'Bearer token-value' } }, res);
  assert.equal(record.data.token, 'token-value');
  assert.ok(record.data.revokedAt instanceof Date);
  assert.deepEqual(res.body, { message: 'Logged out successfully' });
});

test('email verification keeps token validation and initial balance calculation', async () => {
  replaceDatabaseMethod(dbInstance.user, 'findUnique', async () => ({ isVerified: false }));
  mock.method(Math, 'random', () => 0.5);
  let update;
  replaceDatabaseMethod(dbInstance.user, 'update', async args => { update = args; });
  const token = jwt.sign({ email: 'a@example.test' }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const res = response();
  await verifyEmail({ query: { token } }, res);
  assert.deepEqual(update, { where: { email: 'a@example.test' }, data: { isVerified: true, balance: 5500 } });
  assert.deepEqual(res.body, { message: 'Email verified, registration complete' });
  const invalid = response();
  await verifyEmail({ query: { token: 'invalid' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.body, { error: 'Invalid or expired token' });
});

test('resend keeps eligibility checks and verification email response', async () => {
  mock.method(console, 'log', () => {});
  const lookup = replaceDatabaseMethod(dbInstance.user, 'findUnique', async () => ({ email: 'a@example.test', name: 'Alice', isVerified: true }));
  const res = response();
  await resendVerificationEmail({ body: { email: 'a@example.test' } }, res);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'email address is already verified' });
  lookup.mock.mockImplementation(async () => ({ email: 'a@example.test', name: 'Alice', isVerified: false }));
  mock.method(globalThis, 'fetch', async () => ({ ok: true }));
  const success = response();
  await resendVerificationEmail({ body: { email: 'a@example.test' } }, success);
  assert.deepEqual(success.body, { message: 'Verification link sent', validForMinutes: 15 });
  assert.equal(success.statusCode, 200);
});

test('transfer keeps balances, transaction creation, response, and funds rejection', async () => {
  replaceDatabaseMethod(dbInstance.user, 'findUnique', async ({ where }) => ({
    id: where.email === 'a@example.test' ? 'alice' : 'bob', email: where.email,
    isVerified: true, balance: new Prisma.Decimal(where.email === 'a@example.test' ? 100 : 20),
  }));
  const updates = [];
  replaceDatabaseMethod(dbInstance.user, 'update', async args => { updates.push(args); });
  let transaction;
  replaceDatabaseMethod(dbInstance.bankTransaction, 'create', async args => { transaction = args.data; });
  replaceDatabaseMethod(dbInstance, '$transaction', async queries => Promise.all(queries));
  const res = response();
  await transfer({ user: { email: 'a@example.test' }, body: { toEmail: ' B@EXAMPLE.TEST ', amount: 10 } }, res);
  assert.deepEqual(updates, [{ where: { id: 'alice' }, data: { balance: 90 } }, { where: { id: 'bob' }, data: { balance: 30 } }]);
  assert.equal(transaction.fromUserId, 'alice');
  assert.equal(transaction.toUserId, 'bob');
  assert.equal(transaction.amount, 10);
  assert.ok(transaction.timeStamp instanceof Date);
  assert.deepEqual(res.body, { message: 'Transfer successful', to: 'b@example.test', amount: 10 });
  const denied = response();
  await transfer({ user: { email: 'a@example.test' }, body: { toEmail: 'b@example.test', amount: 101 } }, denied);
  assert.equal(denied.statusCode, 409);
  assert.deepEqual(denied.body, { error: 'insufficient funds' });
  assert.equal(updates.length, 2);
});

test('dashboard keeps account fields and signed, sorted transactions', async () => {
  const older = new Date('2026-09-01T00:00:00Z');
  const newer = new Date('2026-09-02T00:00:00Z');
  const balance = new Prisma.Decimal(100);
  const received = new Prisma.Decimal(20);
  replaceDatabaseMethod(dbInstance.user, 'findUnique', async () => ({
    name: 'Alice', email: 'a@example.test', phone: '0501234567', createdAt: older, balance,
    sentTransactions: [{ toUser: { email: 'b@example.test' }, amount: new Prisma.Decimal(10), timeStamp: older }],
    receivedTransactions: [{ fromUser: { email: 'c@example.test' }, amount: received, timeStamp: newer }],
  }));
  const res = response();
  await getDashboard({ user: { email: 'a@example.test' } }, res);
  assert.deepEqual(res.body, { name: 'Alice', email: 'a@example.test', phone: '0501234567', joinedAt: older, balance,
    transactions: [{ type: 'received', email: 'c@example.test', amount: received, date: newer }, { type: 'sent', email: 'b@example.test', amount: -10, date: older }] });
});

test('video calls validate the recipient and return a unique room without a database write', async () => {
  let lookup;
  replaceDatabaseMethod(dbInstance.user, 'findUnique', async args => {
    lookup = args;
    return { email: 'b@example.test', isVerified: true };
  });
  const res = response();
  await startVideoCall({ user: { email: 'a@example.test' }, body: { toEmail: ' B@EXAMPLE.TEST ' } }, res);
  assert.deepEqual(lookup, { where: { email: 'b@example.test' }, select: { email: true, isVerified: true } });
  assert.equal(res.statusCode, 200);
  assert.match(res.body.roomName, /^bank-[0-9a-f-]{36}$/);
  assert.equal(res.body.delivered, false);

  const self = response();
  await startVideoCall({ user: { email: 'a@example.test' }, body: { toEmail: 'a@example.test' } }, self);
  assert.equal(self.statusCode, 409);
  assert.deepEqual(self.body, { error: 'You cannot start a video call with yourself' });

  const invalid = response();
  await startVideoCall({ user: { email: 'a@example.test' }, body: { toEmail: 'not-an-email' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.body, { error: 'A valid recipient email is required' });

  replaceDatabaseMethod(dbInstance.user, 'findUnique', async () => null);
  const unknown = response();
  await startVideoCall({ user: { email: 'a@example.test' }, body: { toEmail: 'missing@example.test' } }, unknown);
  assert.equal(unknown.statusCode, 404);
  assert.deepEqual(unknown.body, { error: 'Recipient is not a verified registered user' });
});

test('chat preserves model responses, output filtering and Retry-After headers', async () => {
  process.env.OPENROUTER_API_KEY = 'synthetic-test-key';
  const { chat } = await import('../dist/controllers/chat.controller.js');
  mock.method(console, 'info', () => {});
  const create = mock.method(Responses.prototype, 'create', async () => ({ output_text: 'Your answer.', id: 'test', model: 'test' }));
  const res = response();
  await chat({ body: { message: 'How do bank transfers work?' }, ip: 'model-test' }, res);
  assert.deepEqual(res.body, { reply: 'Your answer.' });
  create.mock.mockImplementation(async () => ({ output_text: 'Here is a thinking process', id: 'test', model: 'test' }));
  const filtered = response();
  await chat({ body: { message: 'How do bank transfers work?' }, ip: 'model-test' }, filtered);
  assert.deepEqual(filtered.body, { reply: SAFE_REPLY_FALLBACK });
  create.mock.mockImplementation(async () => ({
    output_text: 'User Safety: safe\n[log_70db85] post https://openrouter.ai/api/v1/responses',
    id: 'test', model: 'nvidia/nemotron-3.5-content-safety:free',
  }));
  const diagnostic = response();
  await chat({ body: { message: 'What is a bank?' }, ip: 'model-test' }, diagnostic);
  assert.deepEqual(diagnostic.body, { reply: SAFE_REPLY_FALLBACK });
  for (let i = 0; i < DEFAULT_CHAT_REQUESTS_PER_MINUTE; i++) {
    const mascot = response();
    await chat({ body: { message: 'Who is Tuna?' }, ip: 'limit-test' }, mascot);
    assert.deepEqual(mascot.body, { reply: TUNA_MASCOT_REPLY });
  }
  const limited = response();
  await chat({ body: { message: 'Who is Tuna?' }, ip: 'limit-test' }, limited);
  assert.equal(limited.statusCode, 429);
  assert.ok(limited.headers['Retry-After'] > 0);
});
