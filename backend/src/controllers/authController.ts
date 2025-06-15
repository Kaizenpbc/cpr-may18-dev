export const login = async (req: Request, res: Response) => {
  console.log('🔐 [AUTH] Login attempt:', {
    timestamp: new Date().toISOString(),
    body: req.body,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[REDACTED]' : undefined
    }
  });

  try {
    const { username, password } = req.body;
    console.log('🔑 [AUTH] Validating credentials for user:', username);

    if (!username || !password) {
      console.log('❌ [AUTH] Missing credentials:', { username: !!username, password: !!password });
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    console.log('👤 [AUTH] User lookup result:', { 
      found: !!user,
      role: user?.role,
      organization_id: user?.organization_id
    });

    if (!user) {
      console.log('❌ [AUTH] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔒 [AUTH] Password validation:', { 
      isValid: isValidPassword,
      timestamp: new Date().toISOString()
    });

    if (!isValidPassword) {
      console.log('❌ [AUTH] Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role,
        organization_id: user.organization_id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ [AUTH] Login successful:', {
      userId: user.id,
      role: user.role,
      timestamp: new Date().toISOString()
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        organization_id: user.organization_id
      }
    });
  } catch (error) {
    console.error('❌ [AUTH] Login error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const recoverPassword = async (req: Request, res: Response) => {
  console.log('🔐 [AUTH] Password recovery attempt:', {
    timestamp: new Date().toISOString(),
    body: req.body,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[REDACTED]' : undefined
    }
  });

  try {
    const { email } = req.body;
    console.log('📧 [AUTH] Processing recovery for email:', email);

    if (!email) {
      console.log('❌ [AUTH] Missing email in recovery request');
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
    console.log('👤 [AUTH] User lookup result:', { 
      found: !!user,
      role: user?.role,
      organization_id: user?.organization_id
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      console.log('ℹ️ [AUTH] No user found for email:', email);
      return res.json({ message: 'If an account exists with this email, you will receive recovery instructions.' });
    }

    // TODO: Implement actual email sending
    console.log('📧 [AUTH] Would send recovery email to:', email);

    res.json({ message: 'If an account exists with this email, you will receive recovery instructions.' });
  } catch (error) {
    console.error('❌ [AUTH] Password recovery error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}; 