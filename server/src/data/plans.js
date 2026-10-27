/**
 * Seed data for tenant plans, loaded into the store at startup.
 */

/**
 * @typedef {Object} Plan
 * @property {string} key - Plan identifier used on tenants
 * @property {string} label - Human-readable plan name
 * @property {number} monthlyPrice - Price per month in USD
 * @property {number|null} maxUsers - User limit (null = unlimited)
 * @property {string[]} features - Included features
 */

/** @type {Plan[]} */
const PLAN_SEED = [
  {
    key: 'starter',
    label: 'Starter',
    monthlyPrice: 49,
    maxUsers: 5,
    features: ['Client management', 'CSV import']
  },
  {
    key: 'professional',
    label: 'Professional',
    monthlyPrice: 149,
    maxUsers: 25,
    features: ['Client management', 'CSV import', 'Chart of accounts', 'Transaction reconciliation']
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    monthlyPrice: 499,
    maxUsers: null,
    features: ['Client management', 'CSV import', 'Chart of accounts', 'Transaction reconciliation', 'SSO', 'Dedicated support']
  }
];

module.exports = { PLAN_SEED };
