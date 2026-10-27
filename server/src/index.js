const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const store = require('./data/store');
const { createTenant, validateTenantProvision } = require('./models');
const { CLIENT_TARGET_FIELDS, suggestClientMapping, validateClientMapping } = require('./models/mapping');
const { registerCustomer } = require('./services/customers');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all customers
app.get('/api/customers', (req, res) => {
  res.json(store.getCustomers());
});

// Create a customer, with a pending tenant and onboarding state
app.post('/api/customers', (req, res) => {
  const result = registerCustomer(req.body);
  if (result.errors) {
    return res.status(400).json({ error: 'Invalid customer', fields: result.errors });
  }
  if (result.conflict) {
    return res.status(409).json({ error: result.conflict });
  }
  res.status(201).json(result);
});

// Get customer by ID
app.get('/api/customers/:id', (req, res) => {
  const customer = store.getCustomerById(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

// Get onboarding state for a customer
app.get('/api/customers/:id/onboarding', (req, res) => {
  const state = store.getOnboardingState(req.params.id);
  if (!state) {
    return res.status(404).json({ error: 'Onboarding state not found' });
  }
  res.json(state);
});

// Get all onboarding states (dashboard view)
app.get('/api/onboarding', (req, res) => {
  const states = store.getAllOnboardingStates();
  const customers = store.getCustomers();
  
  // Join customer info with onboarding state
  const dashboard = states.map(state => {
    const customer = customers.find(c => c.id === state.customerId);
    return {
      ...state,
      customerName: customer?.name || 'Unknown',
      customerIndustry: customer?.industry || '',
      customerRegion: customer?.region || ''
    };
  });
  
  res.json(dashboard);
});

// Client field mapping: platform target fields
app.get('/api/mappings/clients/fields', (req, res) => {
  res.json(CLIENT_TARGET_FIELDS);
});

// Client field mapping: suggest targets for source CSV headers
app.post('/api/mappings/clients/suggest', (req, res) => {
  const headers = req.body?.headers;
  if (!Array.isArray(headers) || !headers.every(h => typeof h === 'string')) {
    return res.status(400).json({ error: 'headers must be an array of strings' });
  }
  res.json({ columns: suggestClientMapping(headers) });
});

// Get a customer's saved client field mapping
app.get('/api/customers/:id/mappings/clients', (req, res) => {
  if (!store.getCustomerById(req.params.id)) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const mapping = store.getClientMapping(req.params.id);
  if (!mapping) {
    return res.status(404).json({ error: 'Mapping not found' });
  }
  res.json(mapping);
});

// Save a customer's client field mapping (completes the Data Mapping step)
app.put('/api/customers/:id/mappings/clients', (req, res) => {
  if (!store.getCustomerById(req.params.id)) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const { value, errors } = validateClientMapping(req.body);
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }
  res.json(store.saveClientMapping(req.params.id, value));
});

// Tenant plans
app.get('/api/tenants/plans', (req, res) => {
  res.json(store.getPlans());
});

// Get tenant by customer ID
app.get('/api/tenants/:customerId', (req, res) => {
  const tenant = store.getTenantByCustomerId(req.params.customerId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  res.json(tenant);
});

// Simulated async provisioning
function scheduleProvisioning(tenant) {
  const delay = Number(process.env.PROVISION_DELAY_MS ?? 2000);
  setTimeout(() => {
    if (tenant.subdomain.startsWith('fail-')) {
      store.updateTenant(tenant.id, { status: 'failed', error: 'Provisioning failed: simulated error' });
      store.setStepStatus(tenant.customerId, 'Tenant Setup', 'failed');
    } else {
      store.updateTenant(tenant.id, { status: 'active', error: null });
      store.setStepStatus(tenant.customerId, 'Tenant Setup', 'completed');
    }
  }, delay).unref();
}

// Provision a tenant for a customer
app.post('/api/customers/:id/tenant', (req, res) => {
  const customerId = req.params.id;
  if (!store.getCustomerById(customerId)) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const state = store.getOnboardingState(customerId);
  const mapping = state?.steps.find(s => s.name === 'Data Mapping');
  if (mapping?.status !== 'completed') {
    return res.status(409).json({ error: 'Complete Data Mapping first' });
  }
  const { value, errors } = validateTenantProvision(req.body, store.getPlans().map(p => p.key));
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }
  const taken = store.findTenantBySubdomain(value.subdomain);
  if (taken && taken.customerId !== customerId) {
    return res.status(409).json({ error: 'Subdomain already taken' });
  }
  const existing = store.getTenantByCustomerId(customerId);
  if (existing && (existing.status === 'provisioning' || existing.status === 'active')) {
    return res.status(409).json({ error: 'Tenant already provisioned' });
  }
  const fields = { ...value, status: 'provisioning', error: null };
  const tenant = existing
    ? store.updateTenant(existing.id, fields)
    : store.addTenant(createTenant({ ...fields, id: `tenant_${crypto.randomUUID()}`, customerId }));
  store.setStepStatus(customerId, 'Tenant Setup', 'in_progress');
  scheduleProvisioning(tenant);
  res.status(202).json(tenant);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Onboarding API server running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
