/**
 * Integration tests for auth routes
 *
 * Strategy: minimal Express app mounting only the auth router.
 * All external I/O (DB pool, bcryptjs, jwt, redis, email, sessions) is Jest-mocked
 * so no real network calls happen.
 */

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

jest.mock('../../config/database.js', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
}));

jest.mock('../../utils/jwtUtils.js', () => ({
  generateTokens: jest.fn(() => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  })),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

jest.mock('../../services/emailService.js', () => ({
  emailService: {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../services/sessionManager.js', () => ({
  createUserSession: jest.fn().mockResolvedValue(undefined),
  invalidateUserSession: jest.fn().mockResolvedValue(undefined),
  refreshUserSession: jest.fn().mockResolvedValue(null),
  sessionManager: {},
}));

jest.mock('../../config/redis.js', () => ({
  redisManager: {},
  ensureRedisConnection: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/cacheService.js', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/tokenBlacklist.js', () => ({
  TokenBlacklist: {
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRouter from '../../routes/v1/auth.js';
import { pool } from '../../config/database.js';

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockPool = pool as unknown as { query: jest.Mock };
const mockBcryptCompare = bcrypt.compare as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;
const mockJwtVerify = jwt.verify as jest.Mock;
const mockJwtSign = jwt.sign as jest.Mock;

// ─── Minimal test app ─────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRouter);

// Error handler so asyncHandler-caught errors become JSON responses
app.use((err: { statusCode?: number; code?: string; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
  res.status(err.statusCode || 500).json({
    success: false,
    code: err.code || 'ERROR',
    message: err.message || 'Internal error',
  });
});

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const activeUser = {
  id: 42,
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '$2b$12$hashed',
  role: 'admin',
  organization_id: null,
  location_id: null,
  failed_login_attempts: 0,
  locked_until: null,
  organization_name: null,
  location_name: null,
};

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'Password1' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testuser' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'nobody', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 429 when account is locked', async () => {
    const lockedUser = {
      ...activeUser,
      locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    mockPool.query.mockResolvedValueOnce({ rows: [lockedUser] });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testuser', password: 'Password1' });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('ACCOUNT_LOCKED');
  });

  it('returns 401 and increments failed_login_attempts on wrong password', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [activeUser] })  // SELECT user
      .mockResolvedValueOnce({ rows: [] });             // UPDATE failed_login_attempts
    mockBcryptCompare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testuser', password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');

    const updateCall = mockPool.query.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE users SET failed_login_attempts/);
    expect(updateCall[1][0]).toBe(1); // was 0, now 1
  });

  it('locks account after 10 failed attempts', async () => {
    const almostLockedUser = { ...activeUser, failed_login_attempts: 9 };
    mockPool.query
      .mockResolvedValueOnce({ rows: [almostLockedUser] })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE with locked_until
    mockBcryptCompare.mockResolvedValueOnce(false);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testuser', password: 'WrongPass1' });

    const updateCall = mockPool.query.mock.calls[1];
    // Should include locked_until in the UPDATE
    expect(updateCall[0]).toMatch(/locked_until/);
  });

  it('returns 200 with accessToken and user on valid credentials', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [activeUser] })  // SELECT user
      .mockResolvedValueOnce({ rows: [] });             // UPDATE reset counters
    mockBcryptCompare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testuser', password: 'CorrectPass1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken', 'mock-access-token');
    expect(res.body.data.user).toMatchObject({ id: 42, username: 'testuser', role: 'admin' });
  });

  it('resets failed_login_attempts to 0 on successful login', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [activeUser] })
      .mockResolvedValueOnce({ rows: [] });
    mockBcryptCompare.mockResolvedValueOnce(true);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testuser', password: 'CorrectPass1' });

    const resetCall = mockPool.query.mock.calls[1];
    expect(resetCall[0]).toMatch(/failed_login_attempts = 0/);
    expect(resetCall[1][0]).toBe(activeUser.id);
  });
});

// ─── POST /api/v1/auth/recover-password ──────────────────────────────────────

describe('POST /api/v1/auth/recover-password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/recover-password')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/recover-password')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 200 with generic message when email not found (prevents enumeration)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/v1/auth/recover-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('sends reset email and returns same generic message when user exists', async () => {
    const { emailService } = await import('../../services/emailService.js');
    mockPool.query
      .mockResolvedValueOnce({ rows: [activeUser] })  // SELECT user
      .mockResolvedValueOnce({ rows: [] });             // UPDATE reset_token
    mockJwtSign.mockReturnValueOnce('mock-reset-token');

    const res = await request(app)
      .post('/api/v1/auth/recover-password')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      activeUser.email,
      activeUser.username,
      expect.stringContaining('mock-reset-token')
    );
  });
});

// ─── POST /api/v1/auth/reset-password ────────────────────────────────────────

describe('POST /api/v1/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ newPassword: 'ValidPass1' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_DATA');
  });

  it('returns 400 when newPassword is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'some-token' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_DATA');
  });

  it('returns 400 when password is too weak', async () => {
    mockJwtVerify.mockReturnValueOnce({ userId: 42, type: 'password_reset' });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'valid-token', newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WEAK_PASSWORD');
  });

  it('returns 400 when token is expired or not in DB', async () => {
    mockJwtVerify.mockReturnValueOnce({ userId: 42, type: 'password_reset' });
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // token not found / expired

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'expired-token', newPassword: 'ValidPass1' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EXPIRED_TOKEN');
  });

  it('returns 200 and updates password on valid token', async () => {
    mockJwtVerify.mockReturnValueOnce({ userId: 42, type: 'password_reset' });
    mockPool.query
      .mockResolvedValueOnce({ rows: [activeUser] })  // token lookup
      .mockResolvedValueOnce({ rows: [] });             // UPDATE password
    mockBcryptHash.mockResolvedValueOnce('$2b$12$newhash');

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'valid-token', newPassword: 'ValidPass1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updateCall = mockPool.query.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE users SET password_hash/);
    expect(updateCall[1][0]).toBe('$2b$12$newhash');
    expect(updateCall[1][1]).toBe(42); // decoded.userId
  });
});
