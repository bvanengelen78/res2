import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data and constants
const ADMIN_EMAIL = 'admin@resourceflow.com';
const ADMIN_PASSWORD = 'admin123';
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

// Helper function to authenticate user
async function authenticateUser(page: Page) {
  await page.goto('/');

  // Check if already logged in by looking for main navigation or dashboard content
  const isLoggedIn = await page.locator('nav, [data-testid="dashboard"], .sidebar').isVisible().catch(() => false);
  if (isLoggedIn) {
    return;
  }

  // Look for login form and fill it
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    await submitButton.click();

    // Wait for navigation away from login page
    await page.waitForFunction(() => !document.body.textContent?.includes('Login'), { timeout: 10000 });
  }
}

// Helper function to wait for page to be fully loaded
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');

  // Wait for the main container to be visible
  try {
    await page.waitForSelector('[data-testid="mobile-time-logging-container"]', { timeout: 15000 });
  } catch (error) {
    // If the specific test ID isn't found, wait for general page content
    await page.waitForSelector('h1:has-text("Time Logging")', { timeout: 10000 });
  }
}

// Helper function to enter hours in a cell
async function enterHours(page: Page, projectIndex: number, dayIndex: number, hours: string) {
  const cellSelector = `[data-testid="hour-cell-${projectIndex}-${dayIndex}"]`;
  await page.fill(cellSelector, hours);
  await page.press(cellSelector, 'Tab'); // Trigger auto-save
  await page.waitForTimeout(500); // Wait for save animation
}

test.describe('Mobile Time Logging Interface', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test.describe('Mobile Viewport (375x667px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
    });

    test('should load mobile-first interface correctly', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // Verify main container is present
      await expect(page.locator('[data-testid="mobile-time-logging-container"]')).toBeVisible();
      
      // Verify header
      await expect(page.locator('h1')).toContainText('Time Logging');
      await expect(page.locator('p')).toContainText('Log your project hours for the week');
      
      // Verify week selector is visible
      await expect(page.locator('[data-testid="week-selector"]')).toBeVisible();
      
      // Verify responsive layout
      const container = page.locator('.max-w-4xl');
      await expect(container).toHaveClass(/p-4/);
    });

    test('should display week selection with status indicators', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // Check week navigation buttons
      await expect(page.locator('[data-testid="prev-week-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-week-btn"]')).toBeVisible();
      
      // Check week display
      await expect(page.locator('[data-testid="current-week-display"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-week-display"]')).toContainText(/Week \d+/);
      
      // Check status indicator
      await expect(page.locator('[data-testid="week-status-indicator"]')).toBeVisible();
      
      // Check quick week navigation (mobile specific)
      await expect(page.locator('[data-testid="quick-week-nav"]')).toBeVisible();
    });

    test('should show responsive hour entry grid (4+3 layout)', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // Wait for project allocations to load
      await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 });
      
      const projectCards = page.locator('[data-testid="project-card"]');
      const firstProject = projectCards.first();
      
      // Check mobile grid layout (4+3 for weekdays)
      const firstRow = firstProject.locator('[data-testid="hour-grid-row-1"]');
      const secondRow = firstProject.locator('[data-testid="hour-grid-row-2"]');
      
      await expect(firstRow).toBeVisible();
      await expect(firstRow.locator('[data-testid^="hour-cell"]')).toHaveCount(4);
      
      // Check if weekends are shown (depends on settings)
      const weekendToggle = page.locator('[data-testid="weekend-toggle"]');
      if (await weekendToggle.isChecked()) {
        await expect(secondRow).toBeVisible();
        await expect(secondRow.locator('[data-testid^="hour-cell"]')).toHaveCount(3);
      }
    });

    test('should handle touch-optimized input cells with auto-save', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 });
      
      const firstCell = page.locator('[data-testid="hour-cell-0-0"]').first();
      await expect(firstCell).toBeVisible();
      
      // Test touch-friendly input
      await firstCell.fill('8.00');
      
      // Verify auto-save indicator appears
      await expect(page.locator('[data-testid="saving-indicator-0"]')).toBeVisible();
      
      // Wait for save to complete
      await page.waitForSelector('[data-testid="saved-indicator-0"]', { timeout: 5000 });
      await expect(page.locator('[data-testid="saved-indicator-0"]')).toBeVisible();
      
      // Verify value persists
      await expect(firstCell).toHaveValue('8.00');
    });

    test('should display and interact with smart settings panel', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // Find and expand smart settings panel
      const settingsPanel = page.locator('[data-testid="smart-settings-panel"]');
      await expect(settingsPanel).toBeVisible();
      
      const expandButton = settingsPanel.locator('[data-testid="expand-settings"]');
      await expandButton.click();
      
      // Check weekend toggle
      const weekendToggle = page.locator('[data-testid="weekend-toggle"]');
      await expect(weekendToggle).toBeVisible();
      
      // Check auto-fill toggle
      const autoFillToggle = page.locator('[data-testid="autofill-toggle"]');
      await expect(autoFillToggle).toBeVisible();
      
      // Check quick action buttons
      await expect(page.locator('[data-testid="autofill-week-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="copy-previous-btn"]')).toBeVisible();
      
      // Test weekend toggle functionality
      const initialState = await weekendToggle.isChecked();
      await weekendToggle.click();
      await expect(weekendToggle).toBeChecked({ checked: !initialState });
    });

    test('should complete submission flow with celebration animation', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // Enter some hours first
      await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 });
      
      const firstCell = page.locator('[data-testid="hour-cell-0-0"]').first();
      await firstCell.fill('8.00');
      await page.waitForSelector('[data-testid="saved-indicator-0"]', { timeout: 5000 });

      // Find and click submit button
      const submitButton = page.locator('[data-submit-week]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeEnabled();
      
      await submitButton.click();
      
      // Wait for submission to complete
      await page.waitForSelector('[data-testid="celebration-modal"]', { timeout: 10000 });
      
      // Verify celebration animation
      await expect(page.locator('[data-testid="celebration-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="celebration-modal"]')).toContainText('Week Submitted!');
      
      // Close celebration
      await page.locator('[data-testid="celebration-continue-btn"]').click();
      
      // Verify week status changed to submitted
      await expect(page.locator('[data-testid="week-status-indicator"]')).toContainText('Week Submitted');
    });

    test('should display smart reminders and allow dismissal', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // Wait for smart reminders to appear (they should show based on current state)
      const reminder = page.locator('[data-testid="smart-reminder"]');
      
      // Check if reminder appears (may not always be visible depending on state)
      if (await reminder.isVisible({ timeout: 3000 })) {
        // Verify reminder content
        await expect(reminder).toBeVisible();
        await expect(reminder.locator('[data-testid="reminder-title"]')).toBeVisible();
        await expect(reminder.locator('[data-testid="reminder-message"]')).toBeVisible();
        
        // Test dismissal
        const dismissButton = reminder.locator('[data-testid="dismiss-reminder"]');
        await dismissButton.click();
        
        // Verify reminder is dismissed
        await expect(reminder).not.toBeVisible();
      }
    });
  });

  test.describe('Desktop Viewport (1920x1080px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
    });

    test('should adapt to desktop layout correctly', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // Verify desktop-specific layout
      await expect(page.locator('.max-w-4xl')).toBeVisible();
      
      // Check that quick week navigation is hidden on desktop
      await expect(page.locator('[data-testid="quick-week-nav"]')).not.toBeVisible();
    });

    test('should display hour entry grid in 5/7 column layout', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 });
      
      const projectCard = page.locator('[data-testid="project-card"]').first();
      const hourGrid = projectCard.locator('[data-testid="hour-grid-desktop"]');
      
      await expect(hourGrid).toBeVisible();
      
      // Check for 5 columns (weekdays) by default
      const hourCells = hourGrid.locator('[data-testid^="hour-cell"]');
      await expect(hourCells).toHaveCount(5); // Default weekdays only
      
      // Test weekend toggle to get 7 columns
      const settingsPanel = page.locator('[data-testid="smart-settings-panel"]');
      await settingsPanel.locator('[data-testid="expand-settings"]').click();
      
      const weekendToggle = page.locator('[data-testid="weekend-toggle"]');
      if (!(await weekendToggle.isChecked())) {
        await weekendToggle.click();
        await expect(hourCells).toHaveCount(7); // All days including weekends
      }
    });

    test('should support keyboard shortcuts', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 });
      
      const firstCell = page.locator('[data-testid="hour-cell-0-0"]').first();
      await firstCell.focus();
      
      // Test Ctrl+Up to increase hours
      await firstCell.fill('4.00');
      await page.keyboard.press('Control+ArrowUp');
      await expect(firstCell).toHaveValue('4.50');
      
      // Test Ctrl+Down to decrease hours
      await page.keyboard.press('Control+ArrowDown');
      await expect(firstCell).toHaveValue('4.00');
      
      // Test Enter to save
      await firstCell.fill('8.00');
      await page.keyboard.press('Enter');
      
      // Verify save indicator
      await page.waitForSelector('[data-testid="saved-indicator-0"]', { timeout: 5000 });
      await expect(page.locator('[data-testid="saved-indicator-0"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle no project allocations gracefully', async ({ page }) => {
      // This test would need a user with no allocations
      // For now, we'll test the UI state when no projects are loaded
      
      await page.goto('/mobile-time-logging');
      
      // Mock empty allocations response
      await page.route('**/api/resources/*/allocations/week/*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });
      
      await page.reload();
      await waitForPageLoad(page);
      
      // Verify empty state message
      await expect(page.locator('[data-testid="no-allocations-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-allocations-message"]')).toContainText('No Projects Allocated');
    });

    test('should handle submission errors gracefully', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // Mock submission error
      await page.route('**/api/time-logging/submit/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Submission failed' })
        });
      });

      // Try to submit
      const submitButton = page.locator('[data-submit-week]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Verify error message appears
        await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-toast"]')).toContainText('Submission Failed');
      }
    });
  });

  test.describe('Admin Functionality', () => {
    test('should allow admin to unsubmit weeks', async ({ page }) => {
      await page.goto('/mobile-time-logging');
      await waitForPageLoad(page);

      // First submit a week (if not already submitted)
      const submitButton = page.locator('[data-submit-week]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForSelector('[data-testid="celebration-modal"]', { timeout: 10000 });
        await page.locator('[data-testid="celebration-continue-btn"]').click();
      }

      // Look for unsubmit button (admin only)
      const unsubmitButton = page.locator('[data-testid="unsubmit-week-btn"]');
      if (await unsubmitButton.isVisible()) {
        await unsubmitButton.click();
        
        // Verify week status changes back to in-progress
        await expect(page.locator('[data-testid="week-status-indicator"]')).not.toContainText('Week Submitted');
        
        // Verify submit button is available again
        await expect(page.locator('[data-submit-week]')).toBeVisible();
      }
    });
  });
});
