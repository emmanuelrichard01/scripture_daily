import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page and perform basic validation', async ({ page }) => {
    // Go directly to auth page since root may trigger OnboardingFlow
    await page.goto('/auth');

    // Wait for the auth page to load
    await expect(page.locator('h1')).toContainText('Welcome back');

    // Test form validation for empty fields
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await submitButton.click();

    await expect(page).toHaveURL(/.*\/auth/);
  });

  test('should allow toggling between Sign In and Sign Up', async ({ page }) => {
    await page.goto('/auth');

    const toggleButton = page.getByRole('button', { name: /Sign up/i });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // Should now show Display Name input
    await expect(page.getByPlaceholder('Your name')).toBeVisible(); 
  });
});
