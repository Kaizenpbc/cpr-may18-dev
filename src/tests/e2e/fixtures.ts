import { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

// Shared credentials — test accounts on the server (password: test123)
export const USERS = {
  instructor:  { username: 'instructor',  password: 'test123', portal: '/instructor/dashboard' },
  accountant:  { username: 'accountant',  password: 'test123', portal: '/accounting/dashboard' },
  sysadmin:    { username: 'sysadmin',    password: 'test123', portal: '/sysadmin/dashboard'   },
  admin:       { username: 'admin',       password: 'test123', portal: '/admin/dashboard'       },
} as const;

/** Log in via the login form and wait for navigation away from /login. */
export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('input[name="username"]');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

export type TestFixtures = Record<string, never>;
export const test = base;
export { expect } from '@playwright/test';
