import { test, expect } from '@playwright/test';

test.describe('Settings Functionality', () => {
  test('should open settings panel', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-testid="settings-button"]');
    
    await expect(page.locator('div[data-testid="settings-panel"]')).toBeVisible();
  });

  test('should change theme', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-testid="settings-button"]');
    
    const darkThemeButton = page.locator('button[data-testid="theme-dark"]');
    await darkThemeButton.click();
    
    await expect(page.locator('html')).toHaveClass('dark');
  });

  test('should change language', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-testid="settings-button"]');
    
    const languageSelect = page.locator('select[data-testid="language-select"]');
    await languageSelect.selectOption('zh');
    
    await expect(page.locator('text=设置')).toBeVisible();
  });

  test('should close settings panel', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-testid="settings-button"]');
    await page.click('button[data-testid="close-settings"]');
    
    await expect(page.locator('div[data-testid="settings-panel"]')).not.toBeVisible();
  });
});