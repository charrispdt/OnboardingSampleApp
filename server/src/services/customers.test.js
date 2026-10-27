const { describe, it } = require('node:test');
const assert = require('node:assert');
const { slugify, validateNewCustomer, registerCustomer } = require('./customers');
const store = require('../data/store');

const validInput = (overrides = {}) => ({
  name: 'ABC Accounting',
  industry: 'Accounting',
  region: 'North America',
  contactEmail: 'ops@abc.example.com',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  plan: 'professional',
  ...overrides
});

describe('Customer registration', () => {
  describe('slugify', () => {
    it('should turn a name into a lowercase dashed id', () => {
      assert.strictEqual(slugify('ABC Accounting'), 'abc-accounting');
      assert.strictEqual(slugify('  Artisan Bakery & Cafe! '), 'artisan-bakery-cafe');
    });
  });

  describe('validateNewCustomer', () => {
    it('should accept valid input and trim values', () => {
      const { values, errors } = validateNewCustomer(validInput({ name: '  ABC Accounting  ' }));

      assert.deepStrictEqual(errors, {});
      assert.strictEqual(values.name, 'ABC Accounting');
    });

    it('should default the plan to starter', () => {
      const { values, errors } = validateNewCustomer(validInput({ plan: undefined }));

      assert.deepStrictEqual(errors, {});
      assert.strictEqual(values.plan, 'starter');
    });

    it('should report every missing required field', () => {
      const { errors } = validateNewCustomer({});

      assert.deepStrictEqual(
        Object.keys(errors).sort(),
        ['contactEmail', 'currency', 'dateFormat', 'name', 'region']
      );
    });

    it('should reject values outside the allowed lists', () => {
      const { errors } = validateNewCustomer(validInput({
        contactEmail: 'not-an-email',
        dateFormat: 'DD/MM/YY',
        plan: 'free'
      }));

      assert.deepStrictEqual(Object.keys(errors).sort(), ['contactEmail', 'dateFormat', 'plan']);
    });

    it('should reject a name with no letters or digits', () => {
      const { errors } = validateNewCustomer(validInput({ name: '&&&' }));

      assert.ok(errors.name);
    });

    it('should handle a missing body', () => {
      const { errors } = validateNewCustomer(undefined);

      assert.ok(errors.name);
    });
  });

  describe('registerCustomer', () => {
    it('should create the customer, a pending tenant and onboarding state', () => {
      const result = registerCustomer(validInput({ name: 'Register Test One' }));

      assert.strictEqual(result.customer.id, 'register-test-one');
      assert.strictEqual(result.customer.dateFormat, 'MM/DD/YYYY');
      assert.strictEqual(result.tenant.customerId, 'register-test-one');
      assert.strictEqual(result.tenant.status, 'pending');
      assert.strictEqual(result.tenant.plan, 'professional');
      assert.strictEqual(store.getCustomerById('register-test-one'), result.customer);
      assert.strictEqual(store.getTenantByCustomerId('register-test-one'), result.tenant);
    });

    it('should complete the Customer Info step only', () => {
      const { onboarding } = registerCustomer(validInput({ name: 'Register Test Two' }));

      assert.deepStrictEqual(
        onboarding.steps.map(s => s.status),
        ['completed', 'pending', 'pending', 'pending']
      );
      assert.strictEqual(onboarding.progressPercent, 25);
      assert.strictEqual(store.getOnboardingState('register-test-two'), onboarding);
    });

    it('should return errors and store nothing for invalid input', () => {
      const before = store.getCustomers().length;
      const result = registerCustomer(validInput({ name: 'Register Test Three', currency: 'XXX' }));

      assert.ok(result.errors.currency);
      assert.strictEqual(store.getCustomers().length, before);
    });

    it('should reject a name that maps to an existing id', () => {
      registerCustomer(validInput({ name: 'Register Test Four' }));
      const before = store.getCustomers().length;
      const result = registerCustomer(validInput({ name: 'register test four!' }));

      assert.match(result.conflict, /register-test-four/);
      assert.strictEqual(store.getCustomers().length, before);
    });
  });
});
