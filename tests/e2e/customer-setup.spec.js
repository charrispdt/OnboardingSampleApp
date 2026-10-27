// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Customer setup', () => {
  test('should create a customer and show it in the onboarding queue', async ({ page }) => {
    // The in-memory store persists while the server runs, so use a unique name
    const name = `E2E Accounting ${Date.now()}`;

    await page.goto('/');
    await page.getByRole('button', { name: 'New customer' }).click();
    await expect(page.locator('form h2')).toContainText('New customer');

    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Industry').fill('Accounting');
    await page.getByLabel('Region').selectOption('United Kingdom');
    await page.getByLabel('Contact email').fill('ops@e2e-accounting.example.com');

    // Picking a region suggests its usual currency
    await expect(page.getByLabel('Currency')).toHaveValue('GBP');

    await page.getByLabel('Date format').selectOption('DD-MM-YYYY');
    await page.getByLabel('Plan').selectOption('professional');
    await page.getByRole('button', { name: 'Save customer' }).click();

    // Lands back on the dashboard with the new customer queued
    await expect(page.getByRole('status')).toContainText(`${name} added to the onboarding queue`);
    const card = page.locator('.customer-card', { hasText: name });
    await expect(card).toBeVisible();
    await expect(card).toContainText('United Kingdom');
    await expect(card.locator('.progress-bar')).toContainText('25%');
    await expect(card.locator('.checklist li').first()).toContainText('completed');
  });

  test('should show validation errors and not create a customer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Customer Info' }).click();

    await page.getByLabel('Name').fill('Incomplete Customer');
    await page.getByRole('button', { name: 'Save customer' }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid customer');
    await expect(page.locator('.field-error')).toHaveCount(4);
    await expect(page.getByText('A valid contact email is required')).toBeVisible();

    // Still on the form
    await expect(page.locator('form h2')).toContainText('New customer');
  });
});
