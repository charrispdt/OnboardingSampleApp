/**
 * Customer registration - validates a new customer and creates the
 * customer, its pending tenant and its onboarding state together.
 */

const {
  createCustomer,
  createTenant,
  createDefaultOnboardingSteps,
  calculateProgress
} = require('../models');
const store = require('../data/store');

const REGIONS = ['North America', 'United Kingdom', 'Europe', 'Asia Pacific'];
const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'];
const PLANS = ['starter', 'professional', 'enterprise'];
// Must be chosen explicitly - values like 03/05/2024 parse both ways
const DATE_FORMATS = ['MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turns a customer name into a URL- and file-safe id, e.g. "ABC Accounting" -> "abc-accounting"
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validates and trims new-customer input
 * @param {Object} input - Raw request body
 * @returns {{ values: Object, errors: Object<string, string> }}
 */
function validateNewCustomer(input) {
  const body = input && typeof input === 'object' ? input : {};
  const text = key => (typeof body[key] === 'string' ? body[key].trim() : '');

  const values = {
    name: text('name'),
    industry: text('industry'),
    region: text('region'),
    contactEmail: text('contactEmail'),
    currency: text('currency'),
    dateFormat: text('dateFormat'),
    plan: text('plan') || 'starter'
  };

  const errors = {};
  if (!values.name) {
    errors.name = 'Name is required';
  } else if (!slugify(values.name)) {
    errors.name = 'Name must contain at least one letter or digit';
  }
  if (!REGIONS.includes(values.region)) {
    errors.region = `Region must be one of: ${REGIONS.join(', ')}`;
  }
  if (!EMAIL_PATTERN.test(values.contactEmail)) {
    errors.contactEmail = 'A valid contact email is required';
  }
  if (!CURRENCIES.includes(values.currency)) {
    errors.currency = `Currency must be one of: ${CURRENCIES.join(', ')}`;
  }
  if (!DATE_FORMATS.includes(values.dateFormat)) {
    errors.dateFormat = `Date format must be one of: ${DATE_FORMATS.join(', ')}`;
  }
  if (!PLANS.includes(values.plan)) {
    errors.plan = `Plan must be one of: ${PLANS.join(', ')}`;
  }

  return { values, errors };
}

/**
 * Registers a new customer in the onboarding queue
 * @param {Object} input - Raw request body
 * @returns {{ errors: Object<string, string> } | { conflict: string } | { customer: Object, tenant: Object, onboarding: Object }}
 */
function registerCustomer(input) {
  const { values, errors } = validateNewCustomer(input);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const id = slugify(values.name);
  if (store.getCustomerById(id)) {
    return { conflict: `A customer with id "${id}" already exists` };
  }

  const now = new Date().toISOString();
  const customer = store.addCustomer(createCustomer({
    id,
    name: values.name,
    industry: values.industry,
    region: values.region,
    contactEmail: values.contactEmail,
    currency: values.currency,
    dateFormat: values.dateFormat,
    createdAt: now
  }));

  const tenant = store.addTenant(createTenant({
    id: `tenant_${id}`,
    customerId: id,
    status: 'pending',
    plan: values.plan,
    createdAt: now
  }));

  // Saving the customer's details completes the Customer Info step
  const steps = createDefaultOnboardingSteps().map(step =>
    step.order === 1 ? { ...step, status: 'completed' } : step
  );
  const onboarding = store.addOnboardingState({
    customerId: id,
    steps,
    progressPercent: calculateProgress(steps)
  });

  return { customer, tenant, onboarding };
}

module.exports = {
  REGIONS,
  CURRENCIES,
  PLANS,
  DATE_FORMATS,
  slugify,
  validateNewCustomer,
  registerCustomer
};
