import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

const router = express.Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('[AuthController] Login attempt:', {
      headers: {
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      }
    });

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Join with organizations table to get organization name
    const result = await pool.query(
              `SELECT u.*, o.name as organization_name
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.username = $1`,
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      console.log('[AuthController] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      console.log('[AuthController] Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organization_id
      },
      process.env.JWT_ACCESS_SECRET || 'access_secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organization_id
      },
      process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      { expiresIn: '7d' }
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organization_id,
        organizationName: user.organization_name
      }
    });
  } catch (error) {
    console.error('[AuthController] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request endpoint
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    console.log('[AuthController] Password reset request:', {
      headers: {
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      }
    });

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user) {
      // In a real application, you would send an email here
      console.log('[AuthController] Password reset email would be sent to:', email);
      return res.json({ message: 'If an account exists with this email, you will receive recovery instructions.' });
    }

    // Always return the same message for security
    res.json({ message: 'If an account exists with this email, you will receive recovery instructions.' });
  } catch (error) {
    console.error('[AuthController] Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 