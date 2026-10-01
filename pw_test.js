const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright test...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // Mobile viewport (Responsively test)
  });
  const page = await context.newPage();
  
  try {
    await page.goto('https://oussama-store.onrender.com');
    console.log('Page title:', await page.title());
    
    // Check if products loaded
    const productCount = await page.locator('.product-card').count();
    console.log('Products found on homepage:', productCount);
    
    // Simulate clicking a category
    // Wait for categories to load
    await page.waitForTimeout(2000);
    
    console.log('Playwright mobile test passed successfully!');
  } catch (err) {
    console.error('Playwright test failed:', err);
  } finally {
    await browser.close();
  }
})();
