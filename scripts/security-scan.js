#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, cwd = process.cwd()) {
  try {
    log(`\n🔍 Running: ${command}`, 'cyan');
    const output = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout || error.stderr || ''
    };
  }
}

function generateSecurityReport(results) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(process.cwd(), 'security-reports', `security-scan-${timestamp.split('T')[0]}.md`);
  
  // Ensure reports directory exists
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let report = `# Security Scan Report - ${timestamp.split('T')[0]}\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  
  report += `## Summary\n\n`;
  report += `- **Root Directory:** ${results.root.success ? '✅ Passed' : '❌ Failed'}\n`;
  report += `- **Backend:** ${results.backend.success ? '✅ Passed' : '❌ Failed'}\n`;
  report += `- **Frontend:** ${results.frontend.success ? '✅ Passed' : '❌ Failed'}\n\n`;

  // Add detailed results for each directory
  ['root', 'backend', 'frontend'].forEach(dir => {
    const result = results[dir];
    report += `## ${dir.charAt(0).toUpperCase() + dir.slice(1)} Directory\n\n`;
    
    if (result.success) {
      report += `✅ **Status:** No critical vulnerabilities found\n\n`;
    } else {
      report += `❌ **Status:** Vulnerabilities detected\n\n`;
      report += `**Output:**\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
    }
  });

  // Add recommendations
  report += `## Recommendations\n\n`;
  report += `1. **Regular Scanning:** Run this scan weekly or before each deployment\n`;
  report += `2. **Dependency Updates:** Keep dependencies updated regularly\n`;
  report += `3. **Security Monitoring:** Set up automated security alerts\n`;
  report += `4. **Vulnerability Tracking:** Track and remediate vulnerabilities promptly\n\n`;

  report += `## Next Steps\n\n`;
  if (Object.values(results).some(r => !r.success)) {
    report += `- Review and fix identified vulnerabilities\n`;
    report += `- Update vulnerable dependencies\n`;
    report += `- Consider using \`npm audit fix\` for automatic fixes\n`;
  } else {
    report += `- Continue regular security scanning\n`;
    report += `- Monitor for new vulnerabilities\n`;
  }

  fs.writeFileSync(reportPath, report);
  log(`\n📄 Security report generated: ${reportPath}`, 'green');
  return reportPath;
}

async function main() {
  log('🔒 Starting Comprehensive Security Scan', 'bright');
  log('=====================================', 'bright');

  const results = {};

  // Scan root directory
  log('\n📁 Scanning root directory...', 'blue');
  results.root = runCommand('npm audit --audit-level=moderate');

  // Scan backend directory
  log('\n📁 Scanning backend directory...', 'blue');
  results.backend = runCommand('npm audit --audit-level=moderate', path.join(process.cwd(), 'backend'));

  // Scan frontend directory
  log('\n📁 Scanning frontend directory...', 'blue');
  results.frontend = runCommand('npm audit --audit-level=moderate', path.join(process.cwd(), 'frontend'));

  // Generate summary
  log('\n📊 Security Scan Summary', 'bright');
  log('========================', 'bright');
  
  const totalScans = Object.keys(results).length;
  const passedScans = Object.values(results).filter(r => r.success).length;
  const failedScans = totalScans - passedScans;

  log(`\n✅ Passed: ${passedScans}/${totalScans}`, 'green');
  if (failedScans > 0) {
    log(`❌ Failed: ${failedScans}/${totalScans}`, 'red');
  }

  // Generate detailed report
  const reportPath = generateSecurityReport(results);

  // Exit with appropriate code
  if (failedScans > 0) {
    log('\n⚠️  Security vulnerabilities detected!', 'yellow');
    log('Please review the report and fix vulnerabilities before deployment.', 'yellow');
    process.exit(1);
  } else {
    log('\n🎉 All security scans passed!', 'green');
    log('No critical vulnerabilities detected.', 'green');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the scan
main().catch((error) => {
  log(`\n❌ Scan failed: ${error.message}`, 'red');
  process.exit(1);
});
