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
      return res.status(400).json({ 
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
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
      return res.status(401).json({ 
        error: `User '${username}' not found. Please check your username or contact your administrator.`,
        code: 'USER_NOT_FOUND',
        suggestions: [
          'Check your username spelling',
          'Contact your administrator to create an account',
          'Use the "Forgot Password" option if you have an email account'
        ]
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      console.log('[AuthController] Invalid password for user:', username);
      return res.status(401).json({ 
        error: `Incorrect password for user '${username}'. Please try again or use "Forgot Password".`,
        code: 'INVALID_PASSWORD',
        suggestions: [
          'Check your password spelling',
          'Use "Forgot Password" to reset your password',
          'Contact your administrator for assistance'
        ]
      });
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

    const { email, username } = req.body;

    if (!email && !username) {
      return res.status(400).json({ 
        error: 'Email or username is required',
        code: 'MISSING_IDENTIFIER'
      });
    }

    let query, params;
    if (email) {
      query = 'SELECT * FROM users WHERE email = $1';
      params = [email];
    } else {
      query = 'SELECT * FROM users WHERE username = $1';
      params = [username];
    }

    const result = await pool.query(query, params);
    const user = result.rows[0];

    if (user) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        process.env.JWT_ACCESS_SECRET || 'access_secret',
        { expiresIn: '1h' }
      );

      // Store reset token in database
      await pool.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
        [resetToken, user.id]
      );

      // In a real application, you would send an email here
      console.log('[AuthController] Password reset token generated for:', user.email || user.username);
      
      return res.json({ 
        message: 'Password reset instructions have been sent to your email address.',
        code: 'RESET_SENT',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined // Only in dev
      });
    }

    // Always return the same message for security
    res.json({ 
      message: 'If an account exists with this email/username, you will receive recovery instructions.',
      code: 'RESET_SENT'
    });
  } catch (error) {
    console.error('[AuthController] Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Token and new password are required',
        code: 'MISSING_DATA'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access_secret') as any;
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ 
        error: 'Invalid reset token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if token exists and is not expired
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [decoded.userId, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Reset token is invalid or expired',
        code: 'EXPIRED_TOKEN'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, decoded.userId]
    );

    res.json({ 
      message: 'Password has been reset successfully. You can now log in with your new password.',
      code: 'PASSWORD_RESET'
    });
  } catch (error) {
    console.error('[AuthController] Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (for logged-in users)
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    // Get current user
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);

    res.json({ 
      message: 'Password changed successfully',
      code: 'PASSWORD_CHANGED'
    });
  } catch (error) {
    console.error('[AuthController] Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 