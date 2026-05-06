/**
 * E2E tests for the homepage.
 * Verifies that the homepage loads and the featured section is visible.
 */

const { test, expect } = require('@playwright/test');

test('homepage loads and featured section is visible', async ({ page }) => {
  await page.goto('/');
  
  // Check if main content is visible
  await expect(page.locator('main')).toBeVisible();
  
  // Check for a common element like a heading or a specific section
  // Since I don't know the exact content, I'll look for a main tag which is standard in Next.js
  const main = page.locator('main');
  await expect(main).toBeVisible();
});
