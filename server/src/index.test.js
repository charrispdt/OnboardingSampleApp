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
