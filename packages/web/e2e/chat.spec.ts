import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test('should have a welcome screen when no messages', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Welcome to Doubao AI')).toBeVisible();
    await expect(page.locator('text=Start a conversation')).toBeVisible();
  });

  test('should allow sending a message', async ({ page }) => {
    await page.goto('/');
    
    const inputBox = page.locator('textarea[data-testid="chat-input"]');
    await inputBox.fill('Hello, AI!');
    
    await page.click('button[data-testid="send-button"]');
    
    await expect(page.locator('div[data-testid="message-list"]')).toContainText('Hello, AI!');
  });

  test('should show loading indicator during response', async ({ page }) => {
    await page.goto('/');
    
    const inputBox = page.locator('textarea[data-testid="chat-input"]');
    await inputBox.fill('What is AI?');
    await page.click('button[data-testid="send-button"]');
    
    await expect(page.locator('div[data-testid="loading-indicator"]')).toBeVisible();
  });

  test('should allow creating a new chat', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-testid="new-chat-button"]');
    
    await expect(page.locator('text=Welcome to Doubao AI')).toBeVisible();
  });

  test('should show conversation list in sidebar', async ({ page }) => {
    await page.goto('/');
    
    const sidebar = page.locator('nav[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();
    
    await expect(sidebar.locator('div[data-testid="conversation-item"]')).toBeVisible();
  });

  test('should switch between conversations', async ({ page }) => {
    await page.goto('/');
    
    const inputBox = page.locator('textarea[data-testid="chat-input"]');
    await inputBox.fill('First message');
    await page.click('button[data-testid="send-button"]');
    
    await page.click('button[data-testid="new-chat-button"]');
    
    await inputBox.fill('Second message');
    await page.click('button[data-testid="send-button"]');
    
    const conversations = page.locator('div[data-testid="conversation-item"]');
    await conversations.first().click();
    
    await expect(page.locator('div[data-testid="message-list"]')).toContainText('First message');
  });
});