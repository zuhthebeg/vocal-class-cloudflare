// Test login and capture errors
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newContext().then(c => c.newPage());

  // Capture console
  page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));

  // Capture page errors
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
  });

  // Capture network responses
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();

    if (status >= 400) {
      console.error(`❌ HTTP ${status}: ${url}`);
      try {
        const body = await response.text();
        console.error('Response body:', body.substring(0, 500));
      } catch (e) {}
    }
  });

  try {
    console.log('=== Going to login page ===');
    await page.goto('http://localhost:8788/');
    await page.waitForLoadState('networkidle');

    console.log('\n=== Filling form ===');
    await page.fill('#name', '테스트강사');
    await page.selectOption('#role', 'teacher');

    console.log('\n=== Clicking login ===');
    await page.click('button[type="submit"]');

    // Wait for response or error
    await page.waitForTimeout(3000);

    console.log('\nCurrent URL:', page.url());
    console.log('Page Title:', await page.title());

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();
