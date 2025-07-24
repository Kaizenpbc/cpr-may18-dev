// Test Vendor Detection Service (Phase 1)
// This script tests the vendor auto-detection functionality

async function testVendorDetection() {
  console.log('🧪 [VENDOR DETECTION TEST] Starting vendor detection test...\n');

  try {
    // Dynamic import for ES module
    const { vendorDetectionService } = await import('./backend/src/services/vendorDetectionService.js');

    // Test cases with different vendor name variations
    const testCases = [
      'F.A.S.T. Rescue Incorporated',
      'FAST Rescue',
      'Fast Rescue Incorporated',
      'FAST',
      'EAST Training Services',
      'East Training',
      'Unknown Vendor Company',
      'F.A.S.T. Rescue Inc.',
      'FAST Rescue Corp',
      'East Training Services Ltd.'
    ];

    console.log('📋 [VENDOR DETECTION TEST] Testing vendor name variations:\n');

    for (const testVendorName of testCases) {
      console.log(`🔍 Testing: "${testVendorName}"`);
      
      const result = await vendorDetectionService.detectVendor(testVendorName);
      
      console.log(`   Detected Vendor: ${result.vendorName || 'None'}`);
      console.log(`   Vendor ID: ${result.vendorId || 'None'}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   All Matches: ${result.allMatches.length}`);
      
      if (result.allMatches.length > 0) {
        console.log('   Match Details:');
        result.allMatches.forEach((match, index) => {
          console.log(`     ${index + 1}. ${match.vendorName} (ID: ${match.vendorId}) - ${(match.confidence * 100).toFixed(1)}%`);
        });
      }
      
      console.log('');
    }

    // Test with null/empty vendor name
    console.log('🔍 Testing: null vendor name');
    const nullResult = await vendorDetectionService.detectVendor(null);
    console.log(`   Result: ${nullResult.vendorName || 'None'} (Confidence: ${(nullResult.confidence * 100).toFixed(1)}%)\n`);

    // Test vendor lookup by ID
    console.log('🔍 Testing vendor lookup by ID...');
    const vendor1 = await vendorDetectionService.getVendorById(1);
    const vendor2 = await vendorDetectionService.getVendorById(2);
    
    console.log(`   Vendor ID 1: ${vendor1 ? vendor1.name : 'Not found'}`);
    console.log(`   Vendor ID 2: ${vendor2 ? vendor2.name : 'Not found'}\n`);

    console.log('✅ [VENDOR DETECTION TEST] All tests completed successfully!');

    // Close database connection
    await vendorDetectionService.close();

  } catch (error) {
    console.error('❌ [VENDOR DETECTION TEST] Error:', error);
  }
}

// Run the test
testVendorDetection(); 