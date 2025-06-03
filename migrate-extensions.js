const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

function migrateFileExtensions() {
  console.log('🔄 Migrating file extensions to TypeScript...\n');
  
  const files = getAllFiles('frontend/src');
  let jsxCount = 0;
  let jsCount = 0;
  let errors = 0;
  
  files.forEach(file => {
    const ext = path.extname(file);
    const dir = path.dirname(file);
    const basename = path.basename(file, ext);
    
    try {
      if (ext === '.jsx') {
        // Migrate .jsx to .tsx
        const newPath = path.join(dir, basename + '.tsx');
        if (!fs.existsSync(newPath)) {
          fs.renameSync(file, newPath);
          const relativePath = file.replace(process.cwd(), '').replace(/\\/g, '/');
          console.log(`✅ ${relativePath} → ${basename}.tsx`);
          jsxCount++;
        } else {
          console.log(`⚠️  Skipped ${basename}.jsx (target exists)`);
        }
      } else if (ext === '.js' && !file.includes('test') && !file.includes('spec')) {
        // Migrate .js to .ts (excluding test files)
        const content = fs.readFileSync(file, 'utf8');
        
        // Check if it's likely TypeScript compatible
        const hasJSX = content.includes('jsx') || content.includes('<') || content.includes('React');
        const hasComplexJS = content.includes('module.exports') || content.includes('require(');
        
        if (!hasComplexJS) {
          const newExt = hasJSX ? '.tsx' : '.ts';
          const newPath = path.join(dir, basename + newExt);
          
          if (!fs.existsSync(newPath)) {
            fs.renameSync(file, newPath);
            const relativePath = file.replace(process.cwd(), '').replace(/\\/g, '/');
            console.log(`✅ ${relativePath} → ${basename}${newExt}`);
            jsCount++;
          } else {
            console.log(`⚠️  Skipped ${basename}.js (target exists)`);
          }
        } else {
          console.log(`⚠️  Skipped ${basename}.js (needs manual migration)`);
        }
      }
    } catch (error) {
      console.error(`❌ Error migrating ${file}:`, error.message);
      errors++;
    }
  });
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   .jsx → .tsx: ${jsxCount} files`);
  console.log(`   .js → .ts/.tsx: ${jsCount} files`);
  console.log(`   Errors: ${errors}`);
  
  if (jsxCount + jsCount > 0) {
    console.log(`\n🎉 Migration completed! Re-run analysis to see improvements.`);
    console.log(`💡 Next: Update any import statements that reference the old file names`);
  } else {
    console.log(`\n✅ No files needed migration!`);
  }
}

// Run the migration
migrateFileExtensions(); 