const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('./index');

describe('POST /api/customers', () => {
  let server;
  let base;

  before(async () => {
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://localhost:${server.address().port}`;
  });

  after(() => server.close());

  const post = (body) =>
    fetch(`${base}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

  it('creates a customer with onboarding state', async () => {
    const res = await post({ name: ' New Co ', industry: 'Retail', region: 'EMEA', contactEmail: 'a@b.example' });
    assert.strictEqual(res.status, 201);
    const customer = await res.json();
    assert.strictEqual(customer.name, 'New Co');

    const state = await fetch(`${base}/api/customers/${customer.id}/onboarding`);
    assert.strictEqual(state.status, 200);
    assert.strictEqual((await state.json()).progressPercent, 0);
  });

  it('rejects missing name and invalid email', async () => {
    const res = await post({ name: '  ', contactEmail: 'nope' });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors.name);
    assert.ok(body.errors.contactEmail);
  });

  it('rejects an empty body', async () => {
    const res = await post({});
    assert.strictEqual(res.status, 400);
  });
});

describe('Client field mapping API', () => {
  let server;
  let base;
  let customerId;

  before(async () => {
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://localhost:${server.address().port}`;
    const res = await fetch(`${base}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Mapping Co', contactEmail: 'm@example.com' })
    });
    customerId = (await res.json()).id;
  });

  after(() => server.close());

  const send = (method, path, body) =>
    fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

  it('lists the target fields', async () => {
    const res = await fetch(`${base}/api/mappings/clients/fields`);
    const fields = await res.json();
    assert.ok(fields.some((f) => f.key === 'name' && f.required));
  });

  it('suggests targets for source headers', async () => {
    const res = await send('POST', '/api/mappings/clients/suggest', { headers: ['clientCode', 'companyName'] });
    assert.deepStrictEqual((await res.json()).columns, { clientCode: 'id', companyName: 'name' });
  });

  it('rejects suggest without headers', async () => {
    const res = await send('POST', '/api/mappings/clients/suggest', {});
    assert.strictEqual(res.status, 400);
  });

  it('returns 404 before a mapping is saved', async () => {
    const res = await fetch(`${base}/api/customers/${customerId}/mappings/clients`);
    assert.strictEqual(res.status, 404);
  });

  it('rejects an incomplete mapping', async () => {
    const res = await send('PUT', `/api/customers/${customerId}/mappings/clients`, { columns: { a: 'industry' } });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors.id);
    assert.ok(body.errors.name);
  });

  it('returns 404 for an unknown customer', async () => {
    const res = await send('PUT', '/api/customers/nope/mappings/clients', { columns: { a: 'id', b: 'name' } });
    assert.strictEqual(res.status, 404);
  });

  it('saves a mapping and completes the Data Mapping step', async () => {
    const columns = { clientCode: 'id', companyName: 'name', notes: null };
    const res = await send('PUT', `/api/customers/${customerId}/mappings/clients`, { columns });
    assert.strictEqual(res.status, 200);

    const saved = await fetch(`${base}/api/customers/${customerId}/mappings/clients`);
    assert.deepStrictEqual((await saved.json()).columns, columns);

    const state = await (await fetch(`${base}/api/customers/${customerId}/onboarding`)).json();
    assert.strictEqual(state.steps.find((s) => s.name === 'Data Mapping').status, 'completed');
    assert.strictEqual(state.progressPercent, 25);
  });
});
