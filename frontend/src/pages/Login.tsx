import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

console.log('Login.tsx - Component loading');

const Login = () => {
  console.log('Login - Rendering component');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  // Note: We no longer need to manually navigate after login
  // The AuthContext handles navigation and location restoration

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DEEP TRACE] Login form submitted:', {
      username,
      timestamp: new Date().toISOString()
    });
    setIsLoading(true);

    try {
      const trimmedUsername = username.trim();
      console.log('[DEEP TRACE] Attempting login:', {
        username: trimmedUsername,
        timestamp: new Date().toISOString()
      });
      
      await login(trimmedUsername, password);
      console.log('[DEEP TRACE] Login successful:', {
        username: trimmedUsername,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[DEEP TRACE] Login error:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        timestamp: new Date().toISOString()
      });
      setError(
        err.response?.data?.message ||
          'Failed to login. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component='main' maxWidth='xs'>
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component='h1' variant='h5' align='center' gutterBottom>
            CPR Training Portal
          </Typography>
          <Typography component='h2' variant='h6' align='center' gutterBottom>
            Login
          </Typography>
          {error && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component='form' onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin='normal'
              required
              fullWidth
              id='username'
              label='Username'
              name='username'
              autoComplete='username'
              autoFocus
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
            />
            <TextField
              margin='normal'
              required
              fullWidth
              name='password'
              label='Password'
              type='password'
              id='password'
              autoComplete='current-password'
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
            />
            <Button
              type='submit'
              fullWidth
              variant='contained'
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

console.log('Login.tsx - Exporting component');
export default Login;
