/**
 * In-Memory Data Store
 * Simple storage for the training exercise - no database needed
 */

const { createCustomer, createTenant, createDefaultOnboardingSteps, calculateProgress } = require('../models');

/**
 * Data Transfer Objects (DTOs)
 * Shapes of the records the store accepts and returns. They alias the domain
 * typedefs in ../models so there is a single source of truth for each shape.
 */

/** @typedef {import('../models').Customer} Customer */
/** @typedef {import('../models').Tenant} Tenant */
/** @typedef {import('../models').OnboardingStep} OnboardingStep */
/** @typedef {import('../models').OnboardingState} OnboardingState */

/**
 * Customer record as stored and returned by the store.
 * @typedef {Customer} CustomerDTO
 */

/**
 * Tenant record as stored and returned by the store.
 * @typedef {Tenant} TenantDTO
 */

/**
 * Onboarding step as stored inside an onboarding state.
 * @typedef {OnboardingStep} OnboardingStepDTO
 */

/**
 * Onboarding state of one customer as stored and returned by the store.
 * @typedef {Object} OnboardingStateDTO
 * @property {string} customerId - Customer this state belongs to
 * @property {OnboardingStepDTO[]} steps - Ordered onboarding steps
 * @property {number} progressPercent - Overall progress (0-100)
 */

/**
 * Partial update merged into an existing onboarding state.
 * `customerId` is the lookup key and should not be changed through an update.
 * @typedef {Partial<Omit<OnboardingStateDTO, 'customerId'>>} OnboardingStateUpdateDTO
 */

/**
 * Internal shape of the in-memory store.
 * @typedef {Object} StoreData
 * @property {CustomerDTO[]} customers
 * @property {TenantDTO[]} tenants
 * @property {OnboardingStateDTO[]} onboardingStates
 * @property {Record<string, import('../models/mapping').ClientMappingDTO>} clientMappings - Keyed by customer ID
 */

// In-memory storage
/** @type {StoreData} */
const store = {
  customers: [],
  tenants: [],
  onboardingStates: [],
  clientMappings: {}
};

// Seed with example data
/** @returns {void} */
function seedData() {
  // Example customer - Acme Corporation
  const exampleCustomer = createCustomer({
    id: 'cust_001',
    name: 'Acme Corporation',
    industry: 'Manufacturing',
    region: 'North America',
    contactEmail: 'onboarding@acme.example.com',
    createdAt: '2025-01-15T10:00:00Z'
  });

  // Example tenant for Acme
  const exampleTenant = createTenant({
    id: 'tenant_001',
    customerId: 'cust_001',
    status: 'pending',
    plan: 'professional',
    createdAt: '2025-01-15T10:00:00Z'
  });

  // Example onboarding state - just started, nothing completed
  /** @type {OnboardingStateDTO} */
  const exampleOnboardingState = {
    customerId: 'cust_001',
    steps: createDefaultOnboardingSteps(),
    progressPercent: 0
  };

  store.customers.push(exampleCustomer);
  store.tenants.push(exampleTenant);
  store.onboardingStates.push(exampleOnboardingState);
}

// Initialize with seed data
seedData();

// Store access functions
/**
 * Returns all customers (shallow copy of the list).
 * @returns {CustomerDTO[]}
 */
function getCustomers() {
  return [...store.customers];
}

/**
 * Finds a customer by id.
 * @param {string} id
 * @returns {CustomerDTO|undefined}
 */
function getCustomerById(id) {
  return store.customers.find(c => c.id === id);
}

/**
 * Adds a customer.
 * @param {CustomerDTO} customer
 * @returns {CustomerDTO} The added customer
 */
function addCustomer(customer) {
  store.customers.push(customer);
  return customer;
}

/**
 * Returns all tenants (shallow copy of the list).
 * @returns {TenantDTO[]}
 */
function getTenants() {
  return [...store.tenants];
}

/**
 * Finds the tenant of a customer.
 * @param {string} customerId
 * @returns {TenantDTO|undefined}
 */
function getTenantByCustomerId(customerId) {
  return store.tenants.find(t => t.customerId === customerId);
}

/**
 * Adds a tenant.
 * @param {TenantDTO} tenant
 * @returns {TenantDTO} The added tenant
 */
function addTenant(tenant) {
  store.tenants.push(tenant);
  return tenant;
}

/**
 * Finds the onboarding state of a customer.
 * @param {string} customerId
 * @returns {OnboardingStateDTO|undefined}
 */
function getOnboardingState(customerId) {
  return store.onboardingStates.find(s => s.customerId === customerId);
}

/**
 * Returns all onboarding states (shallow copy of the list).
 * @returns {OnboardingStateDTO[]}
 */
function getAllOnboardingStates() {
  return [...store.onboardingStates];
}

/**
 * Adds an onboarding state.
 * @param {OnboardingStateDTO} state
 * @returns {OnboardingStateDTO} The added state
 */
function addOnboardingState(state) {
  store.onboardingStates.push(state);
  return state;
}

/**
 * Shallow-merges updates into a customer's onboarding state.
 * @param {string} customerId
 * @param {OnboardingStateUpdateDTO} updates
 * @returns {OnboardingStateDTO|null} The updated state, or null if the customer has none
 */
function updateOnboardingState(customerId, updates) {
  const index = store.onboardingStates.findIndex(s => s.customerId === customerId);
  if (index !== -1) {
    store.onboardingStates[index] = { ...store.onboardingStates[index], ...updates };
    return store.onboardingStates[index];
  }
  return null;
}

/**
 * Returns the saved client field mapping of a customer.
 * @param {string} customerId
 * @returns {import('../models/mapping').ClientMappingDTO|undefined}
 */
function getClientMapping(customerId) {
  return store.clientMappings[customerId];
}

/**
 * Saves a customer's client field mapping and completes the Data Mapping step.
 * @param {string} customerId
 * @param {import('../models/mapping').ClientMappingDTO} mapping
 * @returns {import('../models/mapping').ClientMappingDTO} The saved mapping
 */
function saveClientMapping(customerId, mapping) {
  store.clientMappings[customerId] = mapping;
  const state = getOnboardingState(customerId);
  if (state) {
    const steps = state.steps.map(s => (s.name === 'Data Mapping' ? { ...s, status: 'completed' } : s));
    updateOnboardingState(customerId, { steps, progressPercent: calculateProgress(steps) });
  }
  return mapping;
}

module.exports = {
  getClientMapping,
  saveClientMapping,
  getCustomers,
  getCustomerById,
  addCustomer,
  getTenants,
  getTenantByCustomerId,
  addTenant,
  getOnboardingState,
  getAllOnboardingStates,
  addOnboardingState,
  updateOnboardingState
};
