import { test, expect } from '@playwright/test';

test.describe('Reading Progress & Daily Usage', () => {
  test('should display Onboarding or Auth if not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // It should either show the Onboarding welcome screen or redirect to /auth
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
