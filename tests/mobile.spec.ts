import { test, expect } from '@playwright/test';

test.describe('Mobile Layout', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test('should show horizontal rank and suit on mobile', async ({ page }) => {
    await page.goto('/');

    // Find a card and check the flex direction of the rank/suit container
    const cardRankSuitContainer = page.getByTestId('card-rank-suit').first();
    await expect(cardRankSuitContainer).toHaveCSS('flex-direction', 'column');
  });
});

test.describe('Desktop Layout', () => {
  test.use({ viewport: { width: 1280, height: 720 }, hasTouch: false });

  test('should show vertical rank and suit on desktop', async ({ page }) => {
    await page.goto('/');

    const cardRankSuitContainer = page.getByTestId('card-rank-suit').first();
    await expect(cardRankSuitContainer).toHaveCSS('flex-direction', 'column');
  });
});
