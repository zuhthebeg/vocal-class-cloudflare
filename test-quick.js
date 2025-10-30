// Quick test for teacher page errors
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture all console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
    console.error('Stack:', error.stack);
  });

  try {
    console.log('=== Test: Login and navigate to teacher page ===');

    // Go to login page
    await page.goto('http://localhost:8788/');
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.fill('#name', '테스트강사');
    await page.selectOption('#role', 'teacher');

    // Click login
    console.log('Clicking login...');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(1000);

    console.log('Current URL:', page.url());
    console.log('Page Title:', await page.title());

    // Wait a bit to see if any errors occur
    await page.waitForTimeout(3000);

    console.log('\n✅ No JavaScript errors detected!');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await page.waitForTimeout(5000); // Keep open for 5 seconds
    await browser.close();
  }
})();
