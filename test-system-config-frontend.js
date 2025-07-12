const fs = require('fs');
const path = require('path');

async function testSystemConfigFrontend() {
  try {
    console.log('🔍 Testing SystemConfiguration frontend component...\n');
    
    // Test 1: Check if the component file exists
    const componentPath = path.join(__dirname, 'frontend/src/components/sysadmin/SystemConfiguration.tsx');
    if (fs.existsSync(componentPath)) {
      console.log('✅ SystemConfiguration.tsx file exists');
    } else {
      console.log('❌ SystemConfiguration.tsx file not found');
      return;
    }
    
    // Test 2: Check if the component can be imported (basic syntax check)
    const componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Check for required imports
    const requiredImports = [
      'import React',
      'import {',
      'import { api }',
      'interface SystemConfig',
      'const SystemConfiguration: React.FC'
    ];
    
    let allImportsFound = true;
    requiredImports.forEach(importName => {
      if (componentContent.includes(importName)) {
        console.log(`✅ Found: ${importName}`);
      } else {
        console.log(`❌ Missing: ${importName}`);
        allImportsFound = false;
      }
    });
    
    // Test 3: Check for required functionality
    const requiredFeatures = [
      'loadConfigurations',
      'handleValueChange',
      'handleSave',
      'useState',
      'useEffect'
    ];
    
    let allFeaturesFound = true;
    requiredFeatures.forEach(feature => {
      if (componentContent.includes(feature)) {
        console.log(`✅ Found: ${feature}`);
      } else {
        console.log(`❌ Missing: ${feature}`);
        allFeaturesFound = false;
      }
    });
    
    // Test 4: Check if API functions are added
    const apiPath = path.join(__dirname, 'frontend/src/services/api.ts');
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      
      const requiredApiFunctions = [
        'getConfigurations: async',
        'updateConfiguration: async',
        'getConfigurationCategories: async'
      ];
      
      let allApiFunctionsFound = true;
      requiredApiFunctions.forEach(func => {
        if (apiContent.includes(func)) {
          console.log(`✅ Found API function: ${func}`);
        } else {
          console.log(`❌ Missing API function: ${func}`);
          allApiFunctionsFound = false;
        }
      });
      
      if (allApiFunctionsFound) {
        console.log('✅ All required API functions are present');
      } else {
        console.log('❌ Some API functions are missing');
      }
    }
    
    // Test 5: Check if component is added to portal
    const portalPath = path.join(__dirname, 'frontend/src/components/portals/SystemAdminPortal.tsx');
    if (fs.existsSync(portalPath)) {
      const portalContent = fs.readFileSync(portalPath, 'utf8');
      
      if (portalContent.includes('import SystemConfiguration')) {
        console.log('✅ SystemConfiguration imported in portal');
      } else {
        console.log('❌ SystemConfiguration not imported in portal');
      }
      
      if (portalContent.includes('System Configuration')) {
        console.log('✅ System Configuration menu item added');
      } else {
        console.log('❌ System Configuration menu item not found');
      }
      
      if (portalContent.includes('<SystemConfiguration />')) {
        console.log('✅ SystemConfiguration component rendered in portal');
      } else {
        console.log('❌ SystemConfiguration component not rendered in portal');
      }
    }
    
    console.log('\n🎉 Frontend SystemConfiguration component tests completed!');
    console.log('💡 Next: Test the component in the browser by navigating to SYSADMIN portal');
    
  } catch (error) {
    console.error('❌ Error testing SystemConfiguration frontend:', error);
  }
}

// Instructions
console.log('🚀 SystemConfiguration Frontend Test Script');
console.log('================================');
console.log('This script tests that the SystemConfiguration component:');
console.log('1. File exists and has correct structure');
console.log('2. Has required imports and functionality');
console.log('3. API functions are added to api.ts');
console.log('4. Component is integrated into SystemAdminPortal');
console.log('================================\n');

testSystemConfigFrontend(); 