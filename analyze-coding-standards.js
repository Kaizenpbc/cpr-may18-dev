const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class CodingStandardsAnalyzer {
  constructor() {
    this.results = {
      fileExtensions: {},
      namingConventions: {
        components: { pascal: 0, camel: 0, other: 0 },
        files: { camel: 0, kebab: 0, other: 0 },
        variables: { camel: 0, other: 0 }
      },
      inconsistencies: [],
      linting: {
        eslintConfig: false,
        prettierConfig: false,
        tsConfig: false
      },
      totalFiles: 0
    };
  }

  // Recursively get all files in directory
  getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
          arrayOfFiles = this.getAllFiles(fullPath, arrayOfFiles);
        }
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
    
    return arrayOfFiles;
  }

  // Analyze file extensions
  analyzeFileExtensions() {
    log('\n📁 Analyzing File Extensions...', 'blue');
    
    const frontendFiles = this.getAllFiles('frontend/src');
    const backendFiles = this.getAllFiles('backend/src');
    
    [...frontendFiles, ...backendFiles].forEach(file => {
      const ext = path.extname(file);
      if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
        this.results.fileExtensions[ext] = (this.results.fileExtensions[ext] || 0) + 1;
        this.totalFiles++;
      }
    });

    // Display results
    Object.entries(this.results.fileExtensions).forEach(([ext, count]) => {
      const percentage = ((count / this.totalFiles) * 100).toFixed(1);
      log(`   ${ext}: ${count} files (${percentage}%)`, 'cyan');
    });

    // Check for mixed extensions in same directories
    this.checkMixedExtensions(frontendFiles);
  }

  checkMixedExtensions(files) {
    const dirExtensions = {};
    
    files.forEach(file => {
      const dir = path.dirname(file);
      const ext = path.extname(file);
      
      if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
        if (!dirExtensions[dir]) dirExtensions[dir] = new Set();
        dirExtensions[dir].add(ext);
      }
    });

    const mixedDirs = Object.entries(dirExtensions)
      .filter(([dir, exts]) => exts.size > 2)
      .slice(0, 5); // Show top 5

    if (mixedDirs.length > 0) {
      log('\n⚠️  Directories with Mixed File Extensions:', 'yellow');
      mixedDirs.forEach(([dir, exts]) => {
        const relativeDir = dir.replace(process.cwd(), '').replace(/\\/g, '/');
        log(`   ${relativeDir}: ${Array.from(exts).join(', ')}`, 'yellow');
        this.results.inconsistencies.push(`Mixed extensions in ${relativeDir}`);
      });
    }
  }

  // Analyze naming conventions
  analyzeNamingConventions() {
    log('\n📝 Analyzing Naming Conventions...', 'blue');
    
    const frontendFiles = this.getAllFiles('frontend/src');
    
    frontendFiles.forEach(file => {
      const filename = path.basename(file, path.extname(file));
      
      // Check component naming (PascalCase vs others)
      if (file.includes('/components/') && ['.jsx', '.tsx'].includes(path.extname(file))) {
        if (/^[A-Z][a-zA-Z0-9]*$/.test(filename)) {
          this.results.namingConventions.components.pascal++;
        } else if (/^[a-z][a-zA-Z0-9]*$/.test(filename)) {
          this.results.namingConventions.components.camel++;
        } else {
          this.results.namingConventions.components.other++;
          this.results.inconsistencies.push(`Non-standard component name: ${filename}`);
        }
      }
      
      // Check general file naming
      if (/^[a-z][a-zA-Z0-9]*$/.test(filename)) {
        this.results.namingConventions.files.camel++;
      } else if (/^[a-z][a-z0-9-]*[a-z0-9]$/.test(filename)) {
        this.results.namingConventions.files.kebab++;
      } else {
        this.results.namingConventions.files.other++;
      }
    });

    // Display results
    const { components, files } = this.results.namingConventions;
    log(`   Components - PascalCase: ${components.pascal}, camelCase: ${components.camel}, Other: ${components.other}`, 'cyan');
    log(`   Files - camelCase: ${files.camel}, kebab-case: ${files.kebab}, Other: ${files.other}`, 'cyan');
  }

  // Check import inconsistencies
  analyzeImportPatterns() {
    log('\n📦 Analyzing Import Patterns...', 'blue');
    
    const files = this.getAllFiles('frontend/src');
    const importIssues = [];
    
    files.forEach(file => {
      if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(file))) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            // Check for explicit file extensions in imports
            if (line.includes('import') && line.match(/from\s+['"][^'"]*\.(js|jsx|ts|tsx)['"]/)) {
              importIssues.push({
                file: file.replace(process.cwd(), '').replace(/\\/g, '/'),
                line: index + 1,
                content: line.trim()
              });
            }
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    });

    if (importIssues.length > 0) {
      log(`   ⚠️  Found ${importIssues.length} imports with explicit extensions`, 'yellow');
      log('   Top 5 examples:', 'yellow');
      importIssues.slice(0, 5).forEach(issue => {
        log(`     ${issue.file}:${issue.line}`, 'yellow');
        log(`     ${issue.content}`, 'yellow');
      });
      this.results.inconsistencies.push(`${importIssues.length} imports with explicit extensions`);
    } else {
      log('   ✅ No explicit file extensions in imports', 'green');
    }
  }

  // Check linting configuration
  analyzeLintingConfig() {
    log('\n🔧 Analyzing Linting Configuration...', 'blue');
    
    // Check ESLint
    if (fs.existsSync('eslint.config.js') || fs.existsSync('.eslintrc.js') || fs.existsSync('.eslintrc.json')) {
      this.results.linting.eslintConfig = true;
      log('   ✅ ESLint configuration found', 'green');
    } else {
      log('   ❌ ESLint configuration missing', 'red');
    }

    // Check Prettier
    if (fs.existsSync('.prettierrc') || fs.existsSync('.prettierrc.js') || fs.existsSync('.prettierrc.json')) {
      this.results.linting.prettierConfig = true;
      log('   ✅ Prettier configuration found', 'green');
    } else {
      log('   ⚠️  Prettier configuration missing', 'yellow');
      this.results.inconsistencies.push('No Prettier configuration');
    }

    // Check TypeScript config
    if (fs.existsSync('tsconfig.json')) {
      this.results.linting.tsConfig = true;
      log('   ✅ TypeScript configuration found', 'green');
      
      // Check strictness
      try {
        const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
        if (tsConfig.compilerOptions?.strict) {
          log('   ✅ TypeScript strict mode enabled', 'green');
        } else {
          log('   ⚠️  TypeScript strict mode not enabled', 'yellow');
        }
      } catch (error) {
        log('   ⚠️  Could not parse TypeScript config', 'yellow');
      }
    } else {
      log('   ❌ TypeScript configuration missing', 'red');
    }
  }

  // Check for code formatting inconsistencies
  analyzeCodeFormatting() {
    log('\n🎨 Analyzing Code Formatting...', 'blue');
    
    const files = this.getAllFiles('frontend/src').slice(0, 10); // Sample 10 files
    const formatIssues = {
      quotes: { single: 0, double: 0 },
      semicolons: { with: 0, without: 0 },
      indentation: { spaces: 0, tabs: 0 }
    };

    files.forEach(file => {
      if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(file))) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach(line => {
            // Check quotes
            const singleQuotes = (line.match(/'/g) || []).length;
            const doubleQuotes = (line.match(/"/g) || []).length;
            if (singleQuotes > doubleQuotes) formatIssues.quotes.single++;
            if (doubleQuotes > singleQuotes) formatIssues.quotes.double++;
            
            // Check semicolons
            if (line.trim().endsWith(';')) formatIssues.semicolons.with++;
            if (line.trim().length > 0 && !line.trim().endsWith(';') && !line.includes('//')) {
              formatIssues.semicolons.without++;
            }
            
            // Check indentation
            if (line.startsWith('\t')) formatIssues.indentation.tabs++;
            if (line.startsWith('  ')) formatIssues.indentation.spaces++;
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    });

    // Report results
    const totalQuotes = formatIssues.quotes.single + formatIssues.quotes.double;
    if (totalQuotes > 0) {
      const singlePercent = ((formatIssues.quotes.single / totalQuotes) * 100).toFixed(1);
      const doublePercent = ((formatIssues.quotes.double / totalQuotes) * 100).toFixed(1);
      log(`   Quotes - Single: ${singlePercent}%, Double: ${doublePercent}%`, 'cyan');
      
      if (Math.abs(formatIssues.quotes.single - formatIssues.quotes.double) / totalQuotes > 0.3) {
        this.results.inconsistencies.push('Mixed quote styles');
      }
    }

    const totalIndent = formatIssues.indentation.spaces + formatIssues.indentation.tabs;
    if (totalIndent > 0) {
      const spacesPercent = ((formatIssues.indentation.spaces / totalIndent) * 100).toFixed(1);
      const tabsPercent = ((formatIssues.indentation.tabs / totalIndent) * 100).toFixed(1);
      log(`   Indentation - Spaces: ${spacesPercent}%, Tabs: ${tabsPercent}%`, 'cyan');
      
      if (formatIssues.indentation.spaces > 0 && formatIssues.indentation.tabs > 0) {
        this.results.inconsistencies.push('Mixed indentation (spaces and tabs)');
      }
    }
  }

  // Generate recommendations
  generateRecommendations() {
    log('\n💡 Recommendations:', 'magenta');
    
    const { fileExtensions, inconsistencies, linting } = this.results;
    
    // File extension recommendations
    const hasJS = fileExtensions['.js'] > 0;
    const hasTS = fileExtensions['.ts'] > 0;
    const hasJSX = fileExtensions['.jsx'] > 0;
    const hasTSX = fileExtensions['.tsx'] > 0;
    
    if (hasJS && hasTS) {
      log('   🔄 Consider migrating all .js files to .ts for consistency', 'yellow');
    }
    
    if (hasJSX && hasTSX) {
      log('   🔄 Consider migrating all .jsx files to .tsx for consistency', 'yellow');
    }

    // Linting recommendations
    if (!linting.prettierConfig) {
      log('   📝 Add Prettier configuration for consistent code formatting', 'yellow');
    }

    // Inconsistency recommendations
    if (inconsistencies.length > 0) {
      log(`   ⚠️  ${inconsistencies.length} inconsistencies found:`, 'yellow');
      inconsistencies.slice(0, 5).forEach(issue => {
        log(`     • ${issue}`, 'yellow');
      });
    }

    if (inconsistencies.length === 0 && linting.eslintConfig && linting.prettierConfig) {
      log('   🎉 Coding standards are well-maintained!', 'green');
    }
  }

  // Main analysis function
  async analyze() {
    log('\n' + '='.repeat(60), 'cyan');
    log('🔍 CODING STANDARDS ANALYSIS', 'bold');
    log('='.repeat(60), 'cyan');

    this.analyzeFileExtensions();
    this.analyzeNamingConventions();
    this.analyzeImportPatterns();
    this.analyzeLintingConfig();
    this.analyzeCodeFormatting();
    this.generateRecommendations();

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 SUMMARY', 'bold');
    log('='.repeat(60), 'cyan');
    
    const standardsScore = this.calculateStandardsScore();
    log(`\n📈 Coding Standards Score: ${standardsScore}%`, 
        standardsScore >= 80 ? 'green' : standardsScore >= 60 ? 'yellow' : 'red');
    
    if (standardsScore >= 80) {
      log('✅ Excellent coding standards!', 'green');
    } else if (standardsScore >= 60) {
      log('⚠️  Good standards with room for improvement', 'yellow');
    } else {
      log('❌ Significant inconsistencies found', 'red');
    }

    return standardsScore;
  }

  calculateStandardsScore() {
    let score = 100;
    
    // Deduct for inconsistencies
    score -= Math.min(this.results.inconsistencies.length * 10, 50);
    
    // Deduct for missing linting config
    if (!this.results.linting.eslintConfig) score -= 15;
    if (!this.results.linting.prettierConfig) score -= 10;
    if (!this.results.linting.tsConfig) score -= 15;
    
    // Deduct for mixed file extensions
    const extCount = Object.keys(this.results.fileExtensions).length;
    if (extCount > 2) score -= (extCount - 2) * 5;
    
    return Math.max(score, 0);
  }
}

// Run analysis
const analyzer = new CodingStandardsAnalyzer();
analyzer.analyze()
  .then(score => {
    process.exit(score >= 60 ? 0 : 1);
  })
  .catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
  }); 