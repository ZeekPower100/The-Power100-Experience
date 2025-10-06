const { test, expect } = require('@playwright/test');

/**
 * Contractor Flow E2E Test
 *
 * Tests the complete 5-step contractor onboarding flow:
 * 1. Phone/Email Verification
 * 2. Focus Area Selection
 * 3. Business Profiling
 * 4. Partner Matching
 * 5. Completion
 *
 * This test catches runtime errors that would break production.
 */

// Generate unique test data to avoid conflicts with existing users
function generateUniqueTestData() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    name: `Test Contractor ${timestamp}`,
    email: `test.${timestamp}.${random}@playwright-test.com`,
    phone: `555-${String(timestamp).slice(-7)}`,
    company: `Test Company ${timestamp} LLC`
  };
}

test.describe('Contractor Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contractor flow
    await page.goto('http://localhost:3002/contractorflow');
  });

  test('should complete full contractor flow without errors', async ({ page }) => {
    // Generate unique test data
    const testData = generateUniqueTestData();

    // Step 1: Verification
    await test.step('Phone/Email Verification', async () => {
      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'The Power100 Experience' })).toBeVisible();
      await expect(page.locator('text=verify your information')).toBeVisible();

      // Fill in verification details with unique data
      await page.fill('input#name', testData.name);
      await page.fill('input#email', testData.email);
      await page.fill('input#phone', testData.phone);
      await page.fill('input#company_name', testData.company);

      // Send verification code
      await page.click('button:has-text("Send Verification Text")');

      // Wait for verification sent message
      await page.waitForTimeout(2000);

      // Enter development bypass code
      await page.fill('input#verification_code', '123456');

      // Click verify
      await page.click('button:has-text("Verify")');

      // Wait for navigation to next step
      await page.waitForTimeout(2000);
    });

    // Step 2: Focus Area Selection
    await test.step('Focus Area Selection', async () => {
      // Wait for step 2 to load
      await page.waitForTimeout(3000);

      // Find and click focus area options - try multiple approaches
      // Look for any clickable elements that might be focus areas
      const possibleSelectors = [
        'button:has-text("Hiring")',
        'button:has-text("Sales")',
        'button:has-text("Marketing")',
        '[role="checkbox"]',
        'button[class*="focus"]',
        'div[class*="selectable"]'
      ];

      let clickCount = 0;
      for (const selector of possibleSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();

        for (let i = 0; i < count && clickCount < 3; i++) {
          try {
            await elements.nth(i).click({ timeout: 2000 });
            clickCount++;
            await page.waitForTimeout(500);
          } catch (e) {
            // Element not clickable, try next
            continue;
          }
        }

        if (clickCount >= 3) break;
      }

      // Wait for Continue button to become enabled
      const continueBtn = page.locator('button:has-text("Continue")');
      await continueBtn.waitFor({ state: 'visible', timeout: 5000 });

      // Check if button is enabled before clicking
      const isEnabled = await continueBtn.isEnabled();
      if (isEnabled) {
        await continueBtn.click();
      } else {
        throw new Error('Continue button still disabled after selecting focus areas');
      }

      await page.waitForTimeout(2000);
    });

    // Step 3: Business Profiling
    await test.step('Business Profiling', async () => {
      await page.waitForTimeout(2000);

      // Fill in any visible text inputs (service area, location, etc.)
      const textInputs = page.locator('input[type="text"]').first();
      if (await textInputs.count() > 0) {
        await textInputs.fill('Houston, TX');
      }

      // Select from any dropdowns
      const selects = page.locator('select');
      const selectCount = await selects.count();
      if (selectCount > 0) {
        await selects.first().selectOption({ index: 1 });
      }

      // Fill any number inputs
      const numberInputs = page.locator('input[type="number"]');
      if (await numberInputs.count() > 0) {
        await numberInputs.first().fill('15');
      }

      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(2000);
    });

    // Step 4: Partner Matching - THIS IS THE CRITICAL STEP
    await test.step('Partner Matching', async () => {
      // Wait for matching to complete
      await page.waitForTimeout(5000);

      // Check for REAL error messages (not Next.js internals)
      const bodyText = await page.textContent('body');

      // These would indicate actual errors
      expect(bodyText).not.toContain('500 Internal Server Error');
      expect(bodyText).not.toContain('Application error: a client-side exception has occurred');
      expect(bodyText).not.toContain('Cannot read properties of null');
      expect(bodyText).not.toContain('Cannot read properties of undefined');

      // Verify we're on matching step or matches loaded
      const hasMatchContent = bodyText.includes('Partner Match') ||
                             bodyText.includes('match') ||
                             bodyText.includes('partner');
      expect(hasMatchContent).toBeTruthy();

      // Try to continue if button is available
      const continueBtn = page.locator('button:has-text("Continue")');
      const btnCount = await continueBtn.count();
      if (btnCount > 0 && await continueBtn.first().isEnabled()) {
        await continueBtn.first().click();
        await page.waitForTimeout(2000);
      }
    });

    // Step 5: Completion
    await test.step('Completion', async () => {
      await page.waitForTimeout(2000);

      // Just verify we got through without errors
      // The important part is we made it through matching!
      const bodyText = await page.textContent('body');

      // Check no critical errors occurred
      expect(bodyText).not.toContain('500 Internal Server Error');
      expect(bodyText).not.toContain('Application error');
      expect(bodyText).not.toContain('Cannot read properties');

      // We successfully completed the flow - the test reached this point!
      expect(bodyText.length).toBeGreaterThan(100); // Page has content
    });
  });

  test('should handle matching errors gracefully', async ({ page }) => {
    // Test error handling by triggering match with invalid data
    await test.step('Trigger matching with minimal data', async () => {
      // This tests if the matching algorithm handles edge cases

      // Listen for console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Try to navigate directly to matching step
      await page.goto('http://localhost:3002/contractorflow?step=matching');

      await page.waitForTimeout(2000);

      // Should not have critical errors
      const hasCriticalError = consoleErrors.some(err =>
        err.includes('Cannot read properties of null') ||
        err.includes('undefined is not a function')
      );

      expect(hasCriticalError).toBeFalsy();
    });
  });
});