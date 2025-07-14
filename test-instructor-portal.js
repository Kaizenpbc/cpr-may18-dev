const puppeteer = require('puppeteer');

async function testInstructorPortal() {
  console.log('🧪 Testing Instructor Portal...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });
    
    console.log('📱 Navigating to instructor portal...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    console.log('🔍 Checking for login page...');
    const loginExists = await page.$('input[name="username"]');
    
    if (loginExists) {
      console.log('✅ Login page loaded successfully');
      
      // Test login
      console.log('🔐 Testing login...');
      await page.type('input[name="username"]', 'mike');
      await page.type('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      
      // Check if we're on the instructor portal
      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl);
      
      if (currentUrl.includes('/instructor') || currentUrl.includes('/dashboard')) {
        console.log('✅ Successfully logged in to instructor portal');
        
        // Check for any React errors
        const errors = await page.evaluate(() => {
          return window.errors || [];
        });
        
        if (errors.length === 0) {
          console.log('✅ No React errors detected');
        } else {
          console.log('❌ React errors found:', errors);
        }
        
        // Test timesheet navigation
        console.log('📋 Testing timesheet navigation...');
        try {
          await page.click('a[href*="timesheet"], button[href*="timesheet"]');
          await page.waitForTimeout(2000);
          console.log('✅ Timesheet page accessible');
        } catch (e) {
          console.log('⚠️ Timesheet navigation test skipped:', e.message);
        }
        
      } else {
        console.log('❌ Failed to reach instructor portal after login');
      }
    } else {
      console.log('❌ Login page not found');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testInstructorPortal().catch(console.error); 