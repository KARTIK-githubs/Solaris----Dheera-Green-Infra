import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import mongoose from 'mongoose';
import { app } from '../index';
import { Account, RateWindow, Session } from '../auth/models';
import { connectDB, disconnectDB } from '../config/db';
import { Assessment } from '../models/Assessment';
import { AuditLog } from '../models/AuditLog';
import { ServiceRequest } from '../models/ServiceRequest';
import { seedDatabase } from '../seed/seedData';

let server: Server;
let base: string;
let customerCookie = '';
let otherCookie = '';
let employeeCookie = '';
let adminCookie = '';
let customerId = '';
let ticketId = '';

const password = 'A long test passphrase';
const assessment = { monthlyBillInr: 6500, terraceAreaSqFt: 720, sanctionedLoadKw: 5, isResidential: true };
const dbName = 'solaris_api_test_' + process.pid;
const port = Number(process.env.SOLARIS_TEST_MONGO_PORT || 27017);
const testURI = `mongodb://127.0.0.1:${port}/${dbName}`;

async function api(path: string, options: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string> } = {}) {
  const { method = 'GET', body, cookie, headers = {} } = options;
  const response = await fetch(base + '/api' + path, {
    method,
    headers: {
      'X-Solaris-Request': '1',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { code: response.status, headers: response.headers, body: response.status === 204 ? null : await response.json() };
}

async function register(email: string) {
  const result = await api('/auth/register', { method: 'POST', body: { email, name: 'Test Account', password } });
  assert.equal(result.code, 201, JSON.stringify(result.body));
  const cookie = result.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.doesNotMatch(JSON.stringify(result.body), /passwordHash|solaris_session/);
  return { id: result.body.data.id as string, cookie: cookie.split(';')[0] };
}

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.TRUSTED_ORIGINS = 'https://preview.example.test';
  process.env.MONGODB_URI = testURI;
  delete process.env.GROQ_API_KEY;
  await connectDB(testURI);
  assert.equal(mongoose.connection.name, dbName);
  await Promise.all([Account.init(), RateWindow.init(), Session.init(), Assessment.init(), ServiceRequest.init()]);
  await seedDatabase();
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  if (mongoose.connection.name === dbName && mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await disconnectDB();
});

describe('Phase 1 API', () => {
  test('health exposes only status, and rejects untrusted origins', async () => {
    const health = await api('/health');
    assert.deepEqual(health.body, { status: 'ok', database: { status: 'connected' } });
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-powered-by'), null);
    const allowed = await api('/health', { method: 'OPTIONS', headers: { Origin: 'https://preview.example.test' } });
    assert.equal(allowed.code, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://preview.example.test');
    assert.equal((await api('/health', { headers: { Origin: 'https://other.example.test' } })).code, 403);
  });

  test('requires a session and a non-simple request header for writes', async () => {
    assert.equal((await api('/assessments')).code, 401);
    assert.equal((await api('/support/requests')).code, 401);
    assert.equal((await api('/ai/assistant', { method: 'POST', body: { prompt: 'hello' } })).code, 401);
    assert.equal((await api('/auth/logout', { method: 'POST', headers: { 'X-Solaris-Request': '' } })).code, 403);
    const malformed = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Solaris-Request': '1' },
      body: '{"email":'
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { success: false, error: 'Invalid JSON request.' });
    assert.equal((await api('/auth/login', { method: 'POST', body: { password: 'a'.repeat(40_000) } })).code, 413);
  });

  test('registration creates only customers and stores a salted hash', async () => {
    const forged = await api('/auth/register', {
      method: 'POST', body: { name: 'Forged', email: 'forged@example.test', password, role: 'admin' }
    });
    assert.equal(forged.code, 400);
    const customer = await register('Customer@example.test');
    customerCookie = customer.cookie;
    customerId = customer.id;
    otherCookie = (await register('other@example.test')).cookie;
    const account = await Account.findById(customerId).select('+passwordHash').orFail();
    assert.equal(account.email, 'customer@example.test');
    assert.equal(account.role, 'customer');
    assert.match(account.passwordHash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    assert.equal((await api('/auth/register', {
      method: 'POST', body: { name: 'Duplicate', email: 'CUSTOMER@example.test', password }
    })).code, 409);
  });

  test('rejects a bad password and restores a valid login session', async () => {
    const login = { method: 'POST', body: { email: 'customer@example.test', password: 'incorrect' } };
    assert.equal((await api('/auth/login', login)).code, 401);
    const result = await api('/auth/login', {
      ...login, cookie: customerCookie, body: { email: 'customer@example.test', password }
    });
    assert.equal(result.code, 200);
    assert.equal((await api('/auth/session', { cookie: customerCookie })).code, 401);
    customerCookie = result.headers.get('set-cookie')!.split(';')[0];
    const me = await api('/auth/session', { cookie: customerCookie });
    assert.equal(me.body.data.id, customerId);
    assert.equal(await Session.exists({ _id: customerCookie.split('=')[1] }), null);
  });

  test('validates assessment inputs, isolates owners and preserves legacy records', async () => {
    const create = (body: unknown) => api('/assessments', { method: 'POST', body, cookie: customerCookie });
    assert.equal((await create({ ...assessment, isResidential: 'false' })).code, 400);
    assert.equal((await create({ ...assessment, monthlyConsumptionKwh: { $ne: 0 } })).code, 400);
    assert.equal((await create({ ...assessment, ownerId: new mongoose.Types.ObjectId() })).code, 400);
    const saved = await create(assessment);
    assert.equal(saved.code, 201, JSON.stringify(saved.body));
    assert.equal(String((await Assessment.findById(saved.body.data._id).orFail()).ownerId), customerId);

    const legacy = { ...saved.body.data, _id: new mongoose.Types.ObjectId() };
    delete legacy.ownerId;
    await Assessment.collection.insertOne(legacy);
    assert.equal((await api('/assessments', { cookie: customerCookie })).body.data.length, 1);
    assert.equal((await api('/assessments/latest', { cookie: customerCookie })).body.data._id, saved.body.data._id);
    assert.deepEqual((await api('/assessments', { cookie: otherCookie })).body.data, []);
    assert.equal((await api('/assessments/latest', { cookie: otherCookie })).body.data, null);
    assert.equal((await api('/assessments', { cookie: otherCookie, headers: { 'X-Solaris-Account': customerId } })).code, 409);
    assert(await Assessment.exists({ _id: legacy._id }));
  });

  test('scopes support requests and obtains audit identity from the session', async () => {
    const payload = { consumerNumber: '102948211', propertyAddress: 'Sample roof', description: 'Check panels' };
    const create = (body: unknown) => api('/support/requests', { method: 'POST', body, cookie: customerCookie });
    assert.equal((await create({ ...payload, customerName: 'Other' })).code, 400);
    const result = await create(payload);
    assert.equal(result.code, 201, JSON.stringify(result.body));
    ticketId = result.body.data.ticketId;
    assert.equal(result.body.data.customerName, 'Test Account');
    assert.deepEqual((await api('/support/requests?consumerNumber=102948211', { cookie: otherCookie })).body.data, []);
    assert.equal((await api('/support/requests?consumerNumber[$ne]=a&consumerNumber=a', { cookie: otherCookie })).code, 400);
    assert.equal((await api(`/support/requests/${ticketId}/status`, {
      method: 'PATCH', cookie: customerCookie, body: { status: 'resolved' }
    })).code, 403);
    assert(await AuditLog.exists({ action: 'SERVICE_REQUEST_SUBMITTED', actor: customerId }));
  });

  test('enforces staff and administrator policy without exposing legacy requests', async () => {
    employeeCookie = (await register('employee@example.test')).cookie;
    adminCookie = (await register('admin@example.test')).cookie;
    await Account.updateOne({ email: 'employee@example.test' }, { role: 'employee' });
    await Account.updateOne({ email: 'admin@example.test' }, { role: 'admin' });
    assert.equal((await api('/community', { cookie: customerCookie })).code, 403);
    assert.equal((await api('/optimiser/runs', { cookie: customerCookie })).code, 403);
    const community = await api('/community', { cookie: employeeCookie });
    assert.equal(community.body.data.members.length, 20);
    const memberPath = `/community/members/${community.body.data.members[0].memberId}/status`;
    assert.equal((await api(memberPath, {
      method: 'PATCH', cookie: employeeCookie, body: { status: 'withdrawn', operatorName: 'forged' }
    })).code, 400);
    assert.equal((await api(memberPath, {
      method: 'PATCH', cookie: employeeCookie, body: { status: 'withdrawn' }
    })).code, 200);
    assert.equal((await api('/community/reset', { method: 'POST', cookie: adminCookie })).code, 410);

    assert.equal((await api('/audit-logs', { cookie: employeeCookie })).code, 403);
    assert.equal((await api('/audit-logs', { cookie: adminCookie })).code, 200);
    const owned = await ServiceRequest.findOne({ ticketId }).lean().orFail();
    const { ownerId, _id, ...legacyTicket } = owned;
    await ServiceRequest.create({ ...legacyTicket, ticketId: 'SR-2026-099' });
    assert.equal((await api('/support/requests', { cookie: employeeCookie })).body.data.length, 1);
    assert.equal((await api(`/support/requests/${ticketId}/status`, {
      method: 'PATCH', cookie: employeeCookie, body: { status: 'resolved' }
    })).code, 200);

    assert.equal((await api('/optimiser/solve', {
      method: 'POST', cookie: employeeCookie, body: { targetCapacityKw: '12' }
    })).code, 400);
    assert.equal((await api('/optimiser/solve', { method: 'POST', cookie: employeeCookie, body: {} })).code, 200);
    assert.equal((await api('/optimiser/runs', { cookie: employeeCookie })).body.data.length, 1);
  });

  test('applies MongoDB-backed limits to the configured assistant route', async context => {
    const assistantClock = Date.now();
    context.mock.method(Date, 'now', () => assistantClock);
    for (let count = 0; count < 8; count += 1) {
      const result = await api('/ai/assistant', { method: 'POST', cookie: otherCookie, body: { prompt: 'Hello' } });
      assert.equal(result.code, 200);
      assert.equal(result.body.data.isLiveModel, false);
    }
    const blocked = await api('/ai/assistant', { method: 'POST', cookie: otherCookie, body: { prompt: 'Hello' } });
    assert.equal(blocked.code, 429);
    assert(blocked.headers.has('retry-after'));
  });

  test('invalidates logout and rejects explicitly expired sessions', async () => {
    assert.equal((await api('/auth/logout', { method: 'POST', cookie: customerCookie })).code, 200);
    assert.equal((await api('/auth/session', { cookie: customerCookie })).code, 401);
    await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    assert.equal((await api('/auth/session', { cookie: otherCookie })).code, 401);
  });

  test('returns a generic response for an unexpected persistence error', async context => {
    context.mock.method(Session, 'findOne', () => {
      throw new Error('Private test fixture details');
    });
    const response = await api('/auth/session', { cookie: adminCookie });
    assert.equal(response.code, 500);
    assert.deepEqual(response.body, { success: false, error: 'Internal server error.' });
  });

  test('keeps liveness available and returns sanitized database errors', async () => {
    await disconnectDB();
    const previousURI = process.env.MONGODB_URI;
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/should_not_be_returned';
    try {
      assert.equal((await api('/health')).body.database.status, 'disconnected');
      const unavailable = await api('/auth/session', { cookie: adminCookie });
      assert.equal(unavailable.code, 503);
      assert.deepEqual(unavailable.body, { success: false, error: 'Database is temporarily unavailable.' });
    } finally {
      process.env.MONGODB_URI = previousURI;
      await connectDB(testURI);
    }
  });
});
