const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const store = require('./data/store');
const { createCustomer, createDefaultOnboardingSteps, validateCustomerCreate } = require('./models');
const { CLIENT_TARGET_FIELDS, suggestClientMapping, validateClientMapping } = require('./models/mapping');

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

// Create customer (and its onboarding state)
app.post('/api/customers', (req, res) => {
  const { value, errors } = validateCustomerCreate(req.body);
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }
  const customer = store.addCustomer(
    createCustomer({ ...value, id: `cust_${crypto.randomUUID()}` })
  );
  store.addOnboardingState({
    customerId: customer.id,
    steps: createDefaultOnboardingSteps(),
    progressPercent: 0
  });
  res.status(201).json(customer);
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

// Get tenant by customer ID
app.get('/api/tenants/:customerId', (req, res) => {
  const tenant = store.getTenantByCustomerId(req.params.customerId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  res.json(tenant);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Onboarding API server running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
