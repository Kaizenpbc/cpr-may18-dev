# Coding Standards Guide

## 🎯 **Current Status: NEEDS IMPROVEMENT (40% Score)**

This guide addresses the significant coding standards inconsistencies found in our codebase analysis.

## 🔧 **CRITICAL ISSUES TO FIX**

### **1. File Extension Inconsistencies** 🔴
**Current:** Mixed `.js`, `.jsx`, `.ts`, `.tsx` throughout codebase
**Target:** Consistent TypeScript usage

#### **Frontend File Extensions:**
```
✅ PREFERRED:
- React Components: .tsx
- Utility/Service files: .ts
- Test files: .test.tsx or .test.ts

❌ AVOID:
- .js files (should be .ts)
- .jsx files (should be .tsx)
```

#### **Migration Strategy:**
```bash
# 1. Rename JSX files to TSX
find frontend/src -name "*.jsx" -exec sh -c 'mv "$0" "${0%.jsx}.tsx"' {} \;

# 2. Rename JS files to TS (after ensuring TypeScript compatibility)
find frontend/src -name "*.js" -exec sh -c 'mv "$0" "${0%.js}.ts"' {} \;
```

### **2. Import Statement Issues** 🔴
**Current:** 21 imports use explicit file extensions
**Target:** No file extensions in imports

#### **Bad Examples (Fix These):**
```typescript
❌ import * as api from '../../services/api.ts';
❌ import Component from './Component.tsx';
❌ import utils from '../utils/helpers.js';
```

#### **Good Examples:**
```typescript
✅ import * as api from '../../services/api';
✅ import Component from './Component';
✅ import utils from '../utils/helpers';
```

#### **Quick Fix Script:**
```bash
# Remove .ts/.tsx/.js/.jsx from import statements
find frontend/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
xargs sed -i "s/from ['\"]([^'\"]*)\.(ts|tsx|js|jsx)['\"]/from '\1'/g"
```

### **3. Code Formatting Inconsistencies** 🟡
**Current:** Mixed quote styles (73% single, 27% double)
**Target:** Consistent formatting via Prettier

#### **New Standards (Prettier Config Added):**
```json
{
  "singleQuote": true,        // 'string' not "string"
  "semi": true,               // Always use semicolons
  "trailingComma": "es5",     // Trailing commas where valid
  "printWidth": 80,           // 80 character line limit
  "tabWidth": 2,              // 2 spaces for indentation
  "useTabs": false            // Spaces, not tabs
}
```

## 📋 **CODING STANDARDS**

### **1. File Naming Conventions**

#### **Components:**
```
✅ PascalCase for React components:
- UserProfile.tsx
- CourseManagement.tsx
- InvoiceDetailDialog.tsx

❌ Avoid:
- userProfile.tsx
- course-management.tsx
- invoice_detail_dialog.tsx
```

#### **Non-Component Files:**
```
✅ camelCase for utilities, services, hooks:
- userService.ts
- formatUtils.ts
- useLocalStorage.ts

✅ kebab-case for pages/routes:
- user-profile.ts
- course-management.ts
```

### **2. Directory Structure Standards**

```
frontend/src/
├── components/           # Reusable UI components (.tsx)
│   ├── common/          # Shared components
│   ├── forms/           # Form components
│   └── dialogs/         # Modal/dialog components
├── pages/               # Page-level components (.tsx)
├── services/            # API/business logic (.ts)
├── utils/               # Helper functions (.ts)
├── hooks/               # Custom React hooks (.ts)
├── types/               # TypeScript type definitions (.ts)
└── contexts/            # React contexts (.tsx)
```

### **3. Import/Export Standards**

#### **Import Order:**
```typescript
// 1. External libraries
import React from 'react';
import { Button, TextField } from '@mui/material';

// 2. Internal utilities/services
import { userService } from '../services/userService';
import { formatDate } from '../utils/dateUtils';

// 3. Components
import UserProfile from './UserProfile';
import ConfirmDialog from '../dialogs/ConfirmDialog';

// 4. Types
import type { User, UserRole } from '../types/user';
```

#### **Export Standards:**
```typescript
// ✅ Named exports for utilities
export const formatCurrency = (amount: number) => { ... };
export const validateEmail = (email: string) => { ... };

// ✅ Default exports for components
export default function UserProfile() { ... }

// ✅ Both when needed
export const UserContext = createContext();
export default UserProvider;
```

### **4. TypeScript Standards**

#### **Type Definitions:**
```typescript
// ✅ Use interfaces for object shapes
interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

// ✅ Use type aliases for unions
type UserRole = 'admin' | 'instructor' | 'organization';

// ✅ Use generics for reusable types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
```

#### **Component Props:**
```typescript
// ✅ Define props interface
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

// ✅ Use interface in component
export default function UserCard({ user, onEdit, className }: UserCardProps) {
  // Component implementation
}
```

## 🛠️ **IMPLEMENTATION PLAN**

### **Phase 1: Critical Fixes (Week 1)**
- [ ] Add Prettier configuration ✅ **DONE**
- [ ] Fix all import statements (remove extensions)
- [ ] Run Prettier on entire codebase
- [ ] Fix quote style inconsistencies

### **Phase 2: File Migration (Week 2)**
- [ ] Rename .jsx files to .tsx
- [ ] Rename .js files to .ts (where TypeScript compatible)
- [ ] Update import statements after renames
- [ ] Test all functionality after migration

### **Phase 3: Standards Enforcement (Week 3)**
- [ ] Update ESLint rules for strict standards
- [ ] Add pre-commit hooks for formatting
- [ ] Document component creation guidelines
- [ ] Create file templates for common patterns

## 🔧 **TOOLS & AUTOMATION**

### **Pre-commit Hooks (Recommended):**
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "prettier --write",
      "eslint --fix",
      "git add"
    ]
  }
}
```

### **VS Code Settings:**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "prettier.requireConfig": true,
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 📊 **SUCCESS METRICS**

### **Target Improvements:**
- **File Extensions:** 100% TypeScript (.ts/.tsx)
- **Import Statements:** 0 imports with explicit extensions
- **Code Formatting:** 100% Prettier compliant
- **Naming Conventions:** 95% compliance
- **Overall Score:** 85%+ (from current 40%)

## 🚀 **QUICK WINS (Do First)**

### **1. Format All Code:**
```bash
# Install Prettier if not installed
npm install --save-dev prettier

# Format all code
npx prettier --write "frontend/src/**/*.{ts,tsx,js,jsx}"
npx prettier --write "backend/src/**/*.{ts,js}"
```

### **2. Fix Import Extensions:**
```bash
# Remove extensions from imports (frontend)
find frontend/src -name "*.ts" -o -name "*.tsx" | \
xargs sed -i.bak "s/from ['\"]\([^'\"]*\)\.\(ts\|tsx\|js\|jsx\)['\"/from '\1'/g"
```

### **3. Verify Improvements:**
```bash
# Re-run analysis
node analyze-coding-standards.js
```

## 📝 **MAINTENANCE**

### **Daily:**
- Code formatted by Prettier automatically
- ESLint catches style violations

### **Weekly:**
- Review new files for standard compliance
- Update this guide as needed

### **Monthly:**
- Run coding standards analysis
- Address any new inconsistencies
- Update team on standards adoption

---

**Current Score:** 40% ❌  
**Target Score:** 85% ✅  
**Priority:** 🔴 **HIGH** - Address immediately for maintainable codebase 