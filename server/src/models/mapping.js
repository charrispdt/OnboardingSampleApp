/**
 * Client field mapping: maps a customer's source CSV columns to platform client fields.
 */

/**
 * @typedef {Object} TargetField
 * @property {string} key - Platform field key
 * @property {string} label - Human-readable label
 * @property {boolean} required - Whether a source column must map to it
 */

/**
 * @typedef {Object} ClientMappingDTO
 * @property {Record<string, string|null>} columns - Source column -> target field key (null = ignored)
 */

/** @type {TargetField[]} */
const CLIENT_TARGET_FIELDS = [
  { key: 'id', label: 'Client ID', required: true },
  { key: 'name', label: 'Client Name', required: true },
  { key: 'entityType', label: 'Entity Type', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'startDate', label: 'Start Date', required: false },
  { key: 'taxId', label: 'Tax ID', required: false },
  { key: 'revenue', label: 'Annual Revenue', required: false },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'paymentTerms', label: 'Payment Terms', required: false },
  { key: 'primaryContact', label: 'Primary Contact', required: false }
];

// Known source column names per target, normalized (lowercase, no separators).
// Taken from the schemas in sample-data/README.md.
const SYNONYMS = {
  id: ['clientid', 'clientcode', 'customerid'],
  name: ['clientname', 'companyname', 'businessname', 'name'],
  entityType: ['businesstype', 'entitytype', 'legalstructure'],
  status: ['status', 'clientstatus', 'accountstatus'],
  startDate: ['dateonboarded', 'startdate', 'registrationdate'],
  taxId: ['taxid', 'federaltaxid', 'taxreference'],
  revenue: ['annualrevenue', 'yearlyrevenue', 'grossrevenue'],
  industry: ['industry', 'sectorcode', 'industrysector'],
  paymentTerms: ['paymentterms', 'billingterms', 'creditterms'],
  primaryContact: ['primarycontact', 'maincontact', 'keycontactname']
};

const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Suggests a target field for each source column; each target is used at most once.
 * @param {string[]} headers
 * @returns {Record<string, string|null>}
 */
function suggestClientMapping(headers) {
  const used = new Set();
  const mapping = {};
  for (const header of headers) {
    const n = normalize(header);
    const target = Object.keys(SYNONYMS).find(key => !used.has(key) && SYNONYMS[key].includes(n));
    if (target) used.add(target);
    mapping[header] = target || null;
  }
  return mapping;
}

/**
 * Validates a client mapping payload.
 * @param {any} body
 * @returns {{ value?: ClientMappingDTO, errors?: Record<string, string> }}
 */
function validateClientMapping(body) {
  const columns = body && typeof body.columns === 'object' && body.columns ? body.columns : null;
  if (!columns) return { errors: { columns: 'Column mapping is required' } };

  const errors = {};
  const keys = new Set(CLIENT_TARGET_FIELDS.map(f => f.key));
  const counts = {};
  for (const target of Object.values(columns)) {
    if (target === null || target === '') continue;
    if (!keys.has(target)) {
      errors.columns = `Unknown target field: ${target}`;
      continue;
    }
    counts[target] = (counts[target] || 0) + 1;
  }
  for (const field of CLIENT_TARGET_FIELDS) {
    if (counts[field.key] > 1) errors[field.key] = `${field.label} is mapped from more than one column`;
    else if (field.required && !counts[field.key]) errors[field.key] = `${field.label} must be mapped`;
  }
  if (Object.keys(errors).length) return { errors };

  const clean = {};
  for (const [col, target] of Object.entries(columns)) clean[col] = target || null;
  return { value: { columns: clean } };
}

module.exports = { CLIENT_TARGET_FIELDS, suggestClientMapping, validateClientMapping };
