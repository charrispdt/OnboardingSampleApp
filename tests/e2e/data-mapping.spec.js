// @ts-check
const path = require('path');
const { test, expect } = require('@playwright/test');

const CLIENTS_CSV = path.join(__dirname, '../../sample-data/CustomerB_XYZFinancialServices/clients.csv');

test.describe('Data Mapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Data Mapping' }).click();
  });

  test('suggests a mapping from a clients CSV and saves it', async ({ page }) => {
    await page.getByLabel('Customer').selectOption({ label: 'Acme Corporation' });
    await page.getByLabel('Clients CSV').setInputFiles(CLIENTS_CSV);

    await expect(page.getByLabel('Target for clientCode')).toHaveValue('id');
    await expect(page.getByLabel('Target for companyName')).toHaveValue('name');

    await page.getByRole('button', { name: 'Save Mapping' }).click();
    await expect(page.getByRole('status')).toContainText('Mapping saved');
  });

  test('shows an error when a required field is unmapped', async ({ page }) => {
    await page.getByLabel('Customer').selectOption({ label: 'Acme Corporation' });
    await page.getByLabel('Clients CSV').setInputFiles(CLIENTS_CSV);
    await page.getByLabel('Target for companyName').selectOption('');

    await page.getByRole('button', { name: 'Save Mapping' }).click();
    await expect(page.getByText('Client Name must be mapped')).toBeVisible();
  });
});
