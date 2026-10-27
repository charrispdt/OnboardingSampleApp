// @ts-check
const { test, expect } = require('@playwright/test');

const API = 'http://localhost:3001';

async function createMappedCustomer(request, name) {
  const res = await request.post(`${API}/api/customers`, {
    data: { name, industry: 'Software', region: 'EU', contactEmail: 'contact@example.com' }
  });
  expect(res.ok()).toBeTruthy();
  const customer = await res.json();
  const map = await request.put(`${API}/api/customers/${customer.id}/mappings/clients`, {
    data: { columns: { a: 'id', b: 'name' } }
  });
  expect(map.ok()).toBeTruthy();
  return customer;
}

test.describe('Tenant Setup', () => {
  test('provisions a tenant and shows it as active', async ({ page, request }) => {
    const name = `Tenant Co ${Date.now()}`;
    await createMappedCustomer(request, name);

    await page.goto('/');
    await page.getByRole('button', { name: 'Tenant Setup' }).click();
    await page.getByLabel('Customer').selectOption({ label: name });
    await page.getByLabel('Plan').selectOption('starter');
    const subdomain = `acme-${Date.now()}`;
    await page.getByLabel('Subdomain').fill(subdomain);
    await page.getByLabel('Admin Email').fill('admin@example.com');
    await page.getByRole('button', { name: 'Provision Tenant' }).click();

    await expect(page.getByRole('status')).toContainText('is active', { timeout: 10000 });
    await expect(page.getByRole('status')).toContainText(subdomain);
  });

  test('shows validation errors for an empty form', async ({ page, request }) => {
    const name = `Tenant Val ${Date.now()}`;
    await createMappedCustomer(request, name);

    await page.goto('/');
    await page.getByRole('button', { name: 'Tenant Setup' }).click();
    await page.getByLabel('Customer').selectOption({ label: name });
    await page.getByRole('button', { name: 'Provision Tenant' }).click();

    await expect(page.getByRole('alert').first()).toBeVisible();
  });
});
