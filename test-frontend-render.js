const puppeteer = require('puppeteer');

async function testFrontendRender() {
  console.log('🔍 Testing frontend rendering...\n');
  
  let browser;
  try {
    // Launch browser
    console.log('📋 Launching browser...');
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`[BROWSER ERROR] ${error.message}`);
    });
    
    // Navigate to frontend
    console.log('📋 Navigating to frontend...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for content to load
    console.log('📋 Waiting for content...');
    await page.waitForTimeout(5000);
    
    // Check if React app is rendering
    console.log('📋 Checking React app...');
    const rootContent = await page.$eval('#root', el => el.innerHTML);
    console.log('✅ Root element content:', rootContent.substring(0, 200) + '...');
    
    // Check for any error messages
    const errorElements = await page.$$('[style*="color: red"]');
    if (errorElements.length > 0) {
      console.log('❌ Found error elements on page');
      for (let i = 0; i < errorElements.length; i++) {
        const errorText = await page.evaluate(el => el.textContent, errorElements[i]);
        console.log(`Error ${i + 1}:`, errorText);
      }
    } else {
      console.log('✅ No visible error elements found');
    }
    
    // Check if loading indicator is still showing
    const loadingIndicator = await page.$('#loading-indicator');
    if (loadingIndicator) {
      const loadingText = await page.evaluate(el => el.textContent, loadingIndicator);
      console.log('⚠️ Loading indicator still visible:', loadingText);
    } else {
      console.log('✅ Loading indicator not visible (app loaded)');
    }
    
    console.log('\n🎉 Frontend Render Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Frontend server is running');
    console.log('✅ HTML is being served');
    console.log('✅ Browser can access the page');
    
    console.log('\n💡 Next Steps:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Look for any React error boundaries');
    console.log('3. Verify all imports are working');
    
  } catch (error) {
    console.error('❌ Error testing frontend render:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

console.log('🚀 Frontend Render Test');
console.log('========================');
console.log('This test checks if the React app is rendering properly');
console.log('========================\n');

testFrontendRender(); 