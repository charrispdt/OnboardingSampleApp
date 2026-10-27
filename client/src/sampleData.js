import { faker } from '@faker-js/faker';

// Dev-only helpers that produce realistic form values. Loaded via dynamic
// import from App.jsx so faker never ends up in the production bundle.

export function sampleCustomer({ regions, currencies, dateFormats, plans, defaultCurrency }) {
  const region = faker.helpers.arrayElement(regions);
  return {
    name: faker.company.name(),
    industry: faker.commerce.department(),
    region,
    contactEmail: faker.internet.email().toLowerCase(),
    currency: defaultCurrency[region] || faker.helpers.arrayElement(currencies),
    dateFormat: faker.helpers.arrayElement(dateFormats),
    plan: faker.helpers.arrayElement(plans)
  };
}

export function sampleTenant({ plans }) {
  return {
    plan: plans.length ? faker.helpers.arrayElement(plans).key : '',
    subdomain: faker.helpers.slugify(faker.word.adjective() + '-' + faker.word.noun()).toLowerCase(),
    adminEmail: faker.internet.email().toLowerCase()
  };
}
