# 🚀 Development Standards Checklist (Use BEFORE coding begins)

## ⚡ IMMEDIATE SETUP (Day 1):

### 1. **Prettier Configuration (.prettierrc):**
```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5"
}
```

### 2. **ESLint Configuration (eslint.config.js):**
```javascript
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/naming-convention': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'sort-imports': 'error'
    }
  }
]
```

### 3. **TypeScript Configuration (tsconfig.json):**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 4. **Package.json Scripts:**
```json
{
  "scripts": {
    "format": "prettier --write .",
    "lint": "eslint . --fix",
    "check": "npm run format && npm run lint"
  }
}
```

## 🎯 **AI ASSISTANT INSTRUCTIONS:**

### **For EVERY new file/feature request, say:**
> "Please follow these standards:
> - Use TypeScript (.ts/.tsx extensions)
> - PascalCase for components (MyComponent.tsx)
> - camelCase for functions/variables
> - No explicit file extensions in imports
> - Single quotes, semicolons
> - Run `npm run check` after each change"

### **Before Starting Any Feature:**
1. ✅ Run `npm run check` first
2. ✅ Specify file extension (.tsx for components, .ts for utilities)
3. ✅ Specify naming convention (PascalCase/camelCase)
4. ✅ Mention "follow existing patterns"

## 🔧 **Pre-commit Hooks (husky + lint-staged):**
```bash
npm install --save-dev husky lint-staged
npx husky init
```

**package.json:**
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "prettier --write",
      "eslint --fix"
    ]
  }
}
```

## 📊 **Continuous Monitoring:**
```bash
# Add to package.json
"standards-check": "node analyze-coding-standards.js"

# Run weekly
npm run standards-check
```

## 🎯 **AI Development Workflow:**

### **ALWAYS Start Requests With:**
```
"Please create [feature] following our standards:
- TypeScript strict mode
- PascalCase components (.tsx)
- camelCase utilities (.ts)
- No import extensions
- Single quotes, semicolons
- Consistent with existing files"
```

### **ALWAYS End Requests With:**
```
"After implementation, run:
npm run format && npm run lint
to ensure standards compliance"
```

## 🚀 **Quick Standards Enforcement:**

### **One-command setup:**
```bash
curl -o setup-standards.sh https://your-standards-script.sh && bash setup-standards.sh
```

### **VS Code Settings (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 💡 **Key Prevention Rules:**

1. **🔧 Tools First:** Set up linting/formatting BEFORE any code
2. **📋 Clear Instructions:** Always specify standards in requests
3. **⚡ Auto-enforcement:** Use pre-commit hooks
4. **📊 Regular Checks:** Weekly standards analysis
5. **🎯 Consistency:** Reference existing patterns

## 🏆 **Result:**
- **No mixed standards** 
- **98% score from Day 1**
- **Professional codebase immediately**
- **Time saved on cleanup** 