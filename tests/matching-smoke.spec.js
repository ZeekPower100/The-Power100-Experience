const { test, expect } = require('@playwright/test');

/**
 * Matching Step Smoke Test (BROWSER-BASED)
 *
 * Tests the matching step through the actual frontend UI.
 * Catches critical errors that prevent matching results from showing.
 * This test would have caught today's 500 error.
 *
 * Runtime: ~10 seconds
 */

test.describe('Matching Step Critical Errors', () => {
  test('should load matching step without 500 errors or crashes', async ({ page }) => {
    // Monitor console for critical errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Monitor page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Go to contractor flow
    await page.goto('http://localhost:3002/contractorflow');

    // Fill out quick form to get to matching
    await page.fill('input#name', 'Smoke Test');
    await page.fill('input#email', 'smoke@test.com');
    await page.fill('input#phone', '555-000-0000');
    await page.fill('input#company_name', 'Test Co');

    await page.click('button:has-text("Send Verification Text")');
    await page.waitForTimeout(2000);

    await page.fill('input#verificationCode', '123456');
    await page.click('button:has-text("Verify")');
    await page.waitForTimeout(2000);

    // Select focus areas
    const focusButtons = page.locator('button, [role="checkbox"]').filter({ hasText: /hiring|sales|growth/i });
    for (let i = 0; i < Math.min(3, await focusButtons.count()); i++) {
      await focusButtons.nth(i).click();
    }
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);

    // Fill profile
    await page.fill('input[placeholder*="Houston"], input[name*="service"], input[name*="area"]', 'Houston, TX');
    await page.selectOption('select', { index: 1 });
    await page.fill('input[type="number"]', '15');
    await page.click('button:has-text("Continue")');

    // CRITICAL: Wait for matching to load
    await page.waitForTimeout(5000);

    // Check the page content for errors
    const bodyText = await page.textContent('body');

    // CRITICAL CHECKS - These would have caught today's error
    expect(bodyText).not.toContain('500');
    expect(bodyText).not.toContain('Internal Server Error');
    expect(bodyText).not.toContain('Cannot read properties of null');
    expect(bodyText).not.toContain('Cannot read properties of undefined');
    expect(bodyText).not.toContain('TypeError');

    // Check console errors
    const hasCriticalConsoleError = consoleErrors.some(err =>
      err.includes('Cannot read properties') ||
      err.includes('500') ||
      err.includes('TypeError')
    );
    expect(hasCriticalConsoleError).toBeFalsy();

    // Check page errors
    const hasCriticalPageError = pageErrors.some(err =>
      err.includes('Cannot read properties') ||
      err.includes('TypeError')
    );
    expect(hasCriticalPageError).toBeFalsy();

    // Verify something loaded (not a blank error page)
    expect(bodyText.length).toBeGreaterThan(100);
  });
});