/**
 * Playwright global setup — intentionally minimal.
 * No login performed here; each test describe block logs in once
 * via beforeAll using test.describe.serial (see portal.spec.ts).
 * This avoids saving short-lived access tokens (15min TTL) that
 * would expire before the tests that need them run.
 */
import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  // Ensure the auth dir exists (used for any future state files)
  const authDir = path.join(process.cwd(), 'playwright', '.auth');
  fs.mkdirSync(authDir, { recursive: true });
}
