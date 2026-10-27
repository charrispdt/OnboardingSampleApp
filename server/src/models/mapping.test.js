const { describe, it } = require('node:test');
const assert = require('node:assert');
const { CLIENT_TARGET_FIELDS, suggestClientMapping, validateClientMapping } = require('./mapping');

const HEADERS = {
  A: ['Client ID', 'Client Name', 'Business Type', 'Status', 'Date Onboarded', 'Tax ID', 'Annual Revenue', 'Industry', 'Payment Terms', 'Primary Contact'],
  B: ['clientCode', 'companyName', 'entityType', 'clientStatus', 'startDate', 'federalTaxId', 'yearlyRevenue', 'sectorCode', 'billingTerms', 'mainContact'],
  C: ['customer_id', 'business_name', 'legal_structure', 'account_status', 'registration_date', 'tax_reference', 'gross_revenue', 'industry_sector', 'credit_terms', 'key_contact_name']
};

describe('Client field mapping', () => {
  describe('suggestClientMapping', () => {
    for (const [customer, headers] of Object.entries(HEADERS)) {
      it(`maps every sample column for customer ${customer}`, () => {
        const mapping = suggestClientMapping(headers);
        const targets = Object.values(mapping);
        assert.strictEqual(targets.filter(Boolean).length, headers.length);
        assert.strictEqual(new Set(targets).size, targets.length);
      });
    }

    it('maps the same concept to the same target across schemas', () => {
      assert.strictEqual(suggestClientMapping(HEADERS.A)['Client Name'], 'name');
      assert.strictEqual(suggestClientMapping(HEADERS.B).companyName, 'name');
      assert.strictEqual(suggestClientMapping(HEADERS.C).business_name, 'name');
    });

    it('leaves unknown columns unmapped', () => {
      assert.deepStrictEqual(suggestClientMapping(['Favourite Colour']), { 'Favourite Colour': null });
    });
  });

  describe('validateClientMapping', () => {
    it('accepts a complete suggested mapping', () => {
      const { value, errors } = validateClientMapping({ columns: suggestClientMapping(HEADERS.A) });
      assert.strictEqual(errors, undefined);
      assert.strictEqual(value.columns['Client ID'], 'id');
    });

    it('requires the required target fields', () => {
      const { errors } = validateClientMapping({ columns: { Industry: 'industry' } });
      const required = CLIENT_TARGET_FIELDS.filter(f => f.required).map(f => f.key);
      assert.deepStrictEqual(Object.keys(errors).sort(), required.sort());
    });

    it('rejects a target mapped from two columns', () => {
      const { errors } = validateClientMapping({ columns: { a: 'id', b: 'name', c: 'name' } });
      assert.match(errors.name, /more than one/);
    });

    it('rejects unknown target fields', () => {
      const { errors } = validateClientMapping({ columns: { a: 'id', b: 'name', c: 'bogus' } });
      assert.ok(errors.columns);
    });

    it('rejects a missing body', () => {
      assert.ok(validateClientMapping(undefined).errors);
    });
  });
});
