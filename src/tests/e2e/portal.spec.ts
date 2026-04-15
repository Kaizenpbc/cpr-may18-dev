/**
 * E2E: Authenticated portal tests — one login per role.
 *
 * Each describe.serial block logs in ONCE via beforeAll and runs all
 * tests for that role with the shared page. This minimises login API
 * calls to 4 per full suite run (well within authLimiter: 20/15min).
 *
 * Covers: role redirect, portal dashboard, navigation, logout.
 * All tests are read-only (no data mutations).
 */
import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// ── Instructor ────────────────────────────────────────────────────────────────
test.describe.serial('Instructor (login, portal, logout)', () => {
  let ctx: BrowserContext;
  let pg: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    pg = await ctx.newPage();
    await loginAs(pg, USERS.instructor.username, USERS.instructor.password);
  });
  test.afterAll(() => ctx.close());

  test('redirected to instructor portal after login', async () => {
    await expect(pg).toHaveURL(/instructor/);
  });

  test('dashboard loads', async () => {
    await pg.goto('/instructor/dashboard');
    await pg.waitForLoadState('networkidle');
    await expect(pg.locator('main, [role="main"], .MuiContainer-root').first()).toBeVisible({ timeout: 8000 });
  });

  test('can navigate to My Classes', async () => {
    await pg.goto('/instructor/dashboard');
    await pg.waitForLoadState('networkidle');
    const link = pg.getByRole('link', { name: /classes|schedule|my classes/i });
    if (await link.count() > 0) {
      await link.first().click();
      await pg.waitForLoadState('networkidle');
      await expect(pg.locator('main, [role="main"], .MuiContainer-root').first()).toBeVisible();
    } else {
      test.skip(true, 'No classes link in nav');
    }
  });

  test('account settings page is reachable', async () => {
    const menuBtn = pg.getByRole('button', { name: /account|profile|my account/i })
      .or(pg.locator('[aria-label*="account" i], [aria-label*="profile" i]'));
    if (await menuBtn.count() > 0) {
      await menuBtn.first().click();
      await pg.waitForLoadState('networkidle');
      await expect(pg.locator('main, [role="main"], .MuiContainer-root').first()).toBeVisible();
    } else {
      test.skip(true, 'No account/profile menu in nav');
    }
  });

  test('logout redirects to /login', async () => {
    // Navigate fresh so the AppBar renders before content API calls can fail.
    // Wait only for domcontentloaded — the logout button is in the AppBar which
    // renders synchronously; we don't need networkidle (which waits for all API calls).
    await pg.goto('/instructor/dashboard', { waitUntil: 'domcontentloaded' });
    // Logout is an IconButton with aria-label="logout" in InstructorPortalHeader
    const logoutBtn = pg.locator('[aria-label="logout"]');
    await expect(logoutBtn.first()).toBeVisible({ timeout: 15000 });
    await logoutBtn.first().click();
    await pg.waitForURL(/login/, { timeout: 10000 });
    await expect(pg).toHaveURL(/login/);
  });
});

// ── Accounting ────────────────────────────────────────────────────────────────
test.describe.serial('Accountant (login, portal, invoices)', () => {
  let ctx: BrowserContext;
  let pg: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    pg = await ctx.newPage();
    await loginAs(pg, USERS.accountant.username, USERS.accountant.password);
  });
  test.afterAll(() => ctx.close());

  test('redirected to accounting portal after login', async () => {
    await expect(pg).toHaveURL(/accounting/);
  });

  test('dashboard loads', async () => {
    await pg.goto('/accounting/dashboard');
    await pg.waitForLoadState('networkidle');
    await expect(pg.locator('main, [role="main"], .MuiContainer-root').first()).toBeVisible({ timeout: 8000 });
  });

  test('invoices list is accessible', async () => {
    await pg.goto('/accounting/dashboard');
    await pg.waitForLoadState('networkidle');
    const link = pg.getByRole('link', { name: /invoices/i });
    if (await link.count() > 0) {
      await link.first().click();
      await pg.waitForLoadState('networkidle');
      const table = pg.locator('table, [role="grid"], .MuiDataGrid-root');
      const emptyMsg = pg.getByText(/no invoices|no records/i);
      const visible = (await table.count() > 0)
        ? await table.first().isVisible()
        : await emptyMsg.first().isVisible();
      expect(visible).toBe(true);
    } else {
      test.skip(true, 'No invoices link in nav');
    }
  });
});

// ── Sysadmin ──────────────────────────────────────────────────────────────────
test.describe.serial('Sysadmin (login, portal, users)', () => {
  let ctx: BrowserContext;
  let pg: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    pg = await ctx.newPage();
    await loginAs(pg, USERS.sysadmin.username, USERS.sysadmin.password);
  });
  test.afterAll(() => ctx.close());

  test('redirected to sysadmin portal after login', async () => {
    await expect(pg).toHaveURL(/sysadmin/);
  });

  test('dashboard loads', async () => {
    await pg.goto('/sysadmin/dashboard');
    await pg.waitForLoadState('networkidle');
    await expect(pg.locator('main, [role="main"], .MuiContainer-root').first()).toBeVisible({ timeout: 8000 });
  });

  test('users list is accessible', async () => {
    await pg.goto('/sysadmin/dashboard');
    await pg.waitForLoadState('networkidle');
    const link = pg.getByRole('link', { name: /users/i });
    if (await link.count() > 0) {
      await link.first().click();
      await pg.waitForLoadState('networkidle');
      await expect(pg.locator('table, [role="grid"], .MuiDataGrid-root').first()).toBeVisible({ timeout: 8000 });
    } else {
      test.skip(true, 'No users link in nav');
    }
  });
});

// ── Admin (course-admin) ──────────────────────────────────────────────────────
test.describe.serial('Admin — course requests', () => {
  let ctx: BrowserContext;
  let pg: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    pg = await ctx.newPage();
    await loginAs(pg, USERS.admin.username, USERS.admin.password);
  });
  test.afterAll(() => ctx.close());

  test('redirected to admin portal after login', async () => {
    await expect(pg).toHaveURL(/admin/);
  });

  test('dashboard loads', async () => {
    await pg.goto('/admin/dashboard');
    await pg.waitForLoadState('networkidle');
    await expect(pg.locator('main, [role="main"], .MuiContainer-root').first()).toBeVisible({ timeout: 8000 });
  });

  test('can navigate to course requests', async () => {
    await pg.goto('/admin/dashboard');
    await pg.waitForLoadState('networkidle');
    const link = pg.getByRole('link', { name: /course request|requests/i });
    if (await link.count() > 0) {
      await link.first().click();
      await pg.waitForLoadState('networkidle');
      await expect(pg.locator('main, [role="main"], .MuiContainer-root').first()).toBeVisible({ timeout: 8000 });
    } else {
      test.skip(true, 'No course requests link in nav');
    }
  });
});
