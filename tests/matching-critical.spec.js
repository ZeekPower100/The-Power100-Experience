const { test, expect } = require('@playwright/test');

/**
 * CRITICAL: Matching Step Error Detection
 *
 * Simplest possible test - just checks if matching page loads without crashing.
 * Would have caught today's 500 error.
 *
 * Runtime: ~3 seconds
 */

test('contractor flow page loads without critical errors', async ({ page }) => {
  // Monitor for critical errors
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  // Just load the page
  await page.goto('http://localhost:3002/contractorflow');
  await page.waitForLoadState('networkidle');

  // Check the actual body text for visible content
  const bodyText = await page.textContent('body');

  // These checks would have caught today's error
  expect(bodyText).not.toContain('500 Internal Server Error');
  expect(bodyText).not.toContain('Application error: a client-side exception has occurred');
  expect(bodyText).not.toContain('Cannot read properties of null');
  expect(bodyText).not.toContain('Cannot read properties of undefined');

  // Check console/page errors
  const hasCriticalError = [...consoleErrors, ...pageErrors].some(err =>
    err.includes('Cannot read properties') ||
    err.includes('500') ||
    err.includes('TypeError')
  );

  expect(hasCriticalError).toBeFalsy();

  // Page should have actual content loaded
  expect(bodyText).toContain('Power100');
});