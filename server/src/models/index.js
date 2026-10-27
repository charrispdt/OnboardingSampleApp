/**
 * Domain Models for Customer Onboarding
 */

/**
 * @typedef {Object} Customer
 * @property {string} id - Unique customer identifier
 * @property {string} name - Customer/company name
 * @property {string} industry - Industry vertical
 * @property {string} region - Geographic region
 * @property {string} contactEmail - Primary contact email
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} Tenant
 * @property {string} id - Unique tenant identifier
 * @property {string} customerId - Associated customer ID
 * @property {string} status - 'pending' | 'provisioning' | 'active' | 'failed'
 * @property {string} plan - 'starter' | 'professional' | 'enterprise'
 * @property {string} subdomain - Tenant subdomain
 * @property {string} adminEmail - Tenant admin email
 * @property {string|null} error - Last provisioning error, if any
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * @typedef {Object} TenantProvisionDTO
 * @property {string} plan - Key of a seeded plan
 * @property {string} subdomain - Lowercased subdomain (3-30 chars)
 * @property {string} adminEmail - Tenant admin email
 */

/**
 * Validates and normalizes a tenant provisioning payload.
 * @param {any} body
 * @param {string[]} planKeys - Keys of the plans that can be chosen
 * @returns {{ value?: TenantProvisionDTO, errors?: Record<string, string> }}
 */
function validateTenantProvision(body, planKeys) {
  const src = body && typeof body === 'object' ? body : {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const value = {
    plan: str(src.plan),
    subdomain: str(src.subdomain).toLowerCase(),
    adminEmail: str(src.adminEmail)
  };
  const errors = {};
  if (!planKeys.includes(value.plan)) errors.plan = `Plan must be one of: ${planKeys.join(', ')}`;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(value.subdomain)) {
    errors.subdomain = 'Subdomain must be 3-30 characters: lowercase letters, digits and hyphens, not starting or ending with a hyphen';
  }
  if (!value.adminEmail) errors.adminEmail = 'Admin email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.adminEmail)) errors.adminEmail = 'Admin email is invalid';
  return Object.keys(errors).length ? { errors } : { value };
}

/**
 * @typedef {Object} OnboardingStep
 * @property {string} id - Step identifier
 * @property {string} name - Human-readable step name
 * @property {string} status - 'pending' | 'in_progress' | 'completed' | 'failed'
 * @property {number} order - Step sequence number
 */

/**
 * @typedef {Object} OnboardingState
 * @property {string} customerId - Associated customer ID
 * @property {OnboardingStep[]} steps - Array of onboarding steps
 * @property {number} progressPercent - Overall progress (0-100)
 */

/**
 * @typedef {Object} CustomerCreateDTO
 * @property {string} name - Customer/company name (required)
 * @property {string} [industry] - Industry vertical
 * @property {string} [region] - Geographic region
 * @property {string} contactEmail - Primary contact email (required)
 */

/**
 * Validates and normalizes a customer create payload.
 * @param {any} body
 * @returns {{ value?: CustomerCreateDTO, errors?: Record<string, string> }}
 */
function validateCustomerCreate(body) {
  const src = body && typeof body === 'object' ? body : {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const value = {
    name: str(src.name),
    industry: str(src.industry),
    region: str(src.region),
    contactEmail: str(src.contactEmail)
  };
  const errors = {};
  if (!value.name) errors.name = 'Name is required';
  if (!value.contactEmail) errors.contactEmail = 'Contact email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail)) {
    errors.contactEmail = 'Contact email is invalid';
  }
  return Object.keys(errors).length ? { errors } : { value };
}

/**
 * Creates a new Customer object
 * @param {Partial<Customer>} data 
 * @returns {Customer}
 */
function createCustomer(data) {
  return {
    id: data.id || `cust_${Date.now()}`,
    name: data.name || '',
    industry: data.industry || '',
    region: data.region || '',
    contactEmail: data.contactEmail || '',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * Creates a new Tenant object
 * @param {Partial<Tenant>} data 
 * @returns {Tenant}
 */
function createTenant(data) {
  return {
    id: data.id || `tenant_${Date.now()}`,
    customerId: data.customerId || '',
    status: data.status || 'pending',
    plan: data.plan || 'starter',
    subdomain: data.subdomain || '',
    adminEmail: data.adminEmail || '',
    error: data.error || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString()
  };
}

/**
 * Creates default onboarding steps
 * @returns {OnboardingStep[]}
 */
function createDefaultOnboardingSteps() {
  return [
    { id: 'step_1', name: 'Customer Info', status: 'pending', order: 1 },
    { id: 'step_2', name: 'Data Mapping', status: 'pending', order: 2 },
    { id: 'step_3', name: 'Tenant Setup', status: 'pending', order: 3 },
    { id: 'step_4', name: 'Import', status: 'pending', order: 4 }
  ];
}

/**
 * Calculates progress percentage from steps
 * @param {OnboardingStep[]} steps 
 * @returns {number}
 */
function calculateProgress(steps) {
  if (!steps || steps.length === 0) return 0;
  const completed = steps.filter(s => s.status === 'completed').length;
  return Math.round((completed / steps.length) * 100);
}

module.exports = {
  validateTenantProvision,
  validateCustomerCreate,
  createCustomer,
  createTenant,
  createDefaultOnboardingSteps,
  calculateProgress
};
