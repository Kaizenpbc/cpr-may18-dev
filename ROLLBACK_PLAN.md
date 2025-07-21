# Multi-Tab Authentication Fix - Rollback Plan

## Current Status
✅ **Fix Applied**: Multi-tab authentication isolation improvements
✅ **Servers Running**: Backend (3001), Frontend (5173)
✅ **Test Setup**: Complete

## Rollback Commands

### Option 1: Git Rollback (Recommended)
```bash
# Rollback to previous commit
git reset --hard HEAD~1

# Restart servers
npm run dev
```

### Option 2: Manual File Rollback
If git rollback fails, manually revert these files:

#### 1. Revert authService.ts
```typescript
// Revert logout function to:
async logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    tokenService.clearTokens();
    delete api.defaults.headers.common['Authorization'];
  }
}

// Remove blacklisted token handling from checkAuth and refreshToken
```

#### 2. Revert tokenService.ts
```typescript
// Revert clearTokens to:
clearTokens(): void {
  inMemoryToken = null;
  tokenExpiry = null;
  
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  
  // Clear from all storage locations
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  
  console.log('[TRACE] Token service - All tokens cleared');
}

// Revert forceLogout to:
forceLogout(): void {
  console.log('[TRACE] Token service - Force logout');
  
  // Save current location before clearing
  this.saveCurrentFullLocation();

  // Clear tokens
  this.clearTokens();

  // Clear all sessionStorage
  sessionStorage.clear();

  // Broadcast logout to other tabs
  this.broadcastSessionUpdate('logout');

  // Clear timers
  if (sessionSyncTimer) {
    clearInterval(sessionSyncTimer);
    sessionSyncTimer = null;
  }

  // Force a hard refresh to login
  window.location.href = '/login';
}
```

## Testing Rollback

### 1. Verify Rollback
```bash
# Check if files are reverted
git status
git diff HEAD~1
```

### 2. Restart Servers
```bash
# Kill existing processes
taskkill /f /im node.exe

# Restart
npm run dev
```

### 3. Test Original Behavior
1. Open http://localhost:5173 in two tabs
2. Tab 1: Login as mike
3. Tab 2: Login as iffat  
4. Tab 1: Logout
5. Verify original multi-tab issue returns

## Emergency Contacts
- **Backup Location**: Git commit before fix
- **Original Issue**: Multi-tab authentication confusion
- **Expected Behavior After Rollback**: Original issue returns

## Rollback Triggers
Rollback if:
- Users report login issues
- Authentication completely broken
- Multiple users affected
- Cannot access any protected routes

## Success Indicators
Rollback successful if:
- Users can log in normally
- No authentication errors in console
- Original multi-tab behavior returns
- No new errors introduced 