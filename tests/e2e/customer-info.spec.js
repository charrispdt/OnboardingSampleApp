// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Customer Info form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Customer Info' }).click();
  });

  test('shows validation errors for an empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Customer' }).click();

    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page.getByText('Contact email is required')).toBeVisible();
  });

  test('shows an error for an invalid email', async ({ page }) => {
    await page.getByLabel('Name').fill('Bad Email Co');
    await page.getByLabel('Contact Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Create Customer' }).click();

    await expect(page.getByText('Contact email is invalid')).toBeVisible();
  });

  test('creates a customer and shows it on the dashboard', async ({ page }) => {
    const name = `E2E Co ${Date.now()}`;
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Industry').fill('Retail');
    await page.getByLabel('Region').fill('EMEA');
    await page.getByLabel('Contact Email').fill('e2e@example.com');
    await page.getByRole('button', { name: 'Create Customer' }).click();

    await expect(page.getByRole('status')).toContainText(`Created customer ${name}`);

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
  });
});
