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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Info,
  Lock,
  Email,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

console.log('Login.tsx - Component loading');

const Login = () => {
  console.log('Login - Rendering component');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState('');
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DEEP TRACE] Login form submitted:', {
      username,
      timestamp: new Date().toISOString()
    });
    setIsLoading(true);
    // DO NOT clear error on submit - let it stay visible

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
      // Only clear error on successful login
      setError(null);
      setErrorCode(null);
      setSuggestions([]);
    } catch (err: any) {
      console.error('[DEEP TRACE] Login error:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        timestamp: new Date().toISOString()
      });

      const errorData = err.response?.data;
      let errorMessage = 'Failed to login. Please check your credentials.';

      if (typeof errorData?.error === 'object') {
        errorMessage = errorData.error.message;
        if (errorData.error.retryAfter) {
          errorMessage += ` Try again in ${errorData.error.retryAfter}.`;
        }
      } else if (typeof errorData?.error === 'string') {
        errorMessage = errorData.error;
      }

      setError(errorMessage);
      setErrorCode(errorData?.code || errorData?.error?.code);
      setSuggestions(errorData?.suggestions || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail && !forgotPasswordUsername) {
      setForgotPasswordMessage('Please enter either an email or username');
      return;
    }

    setIsForgotPasswordLoading(true);
    setForgotPasswordMessage(null);

    try {
      const response = await api.post('/auth/forgot-password', {
        email: forgotPasswordEmail || undefined,
        username: forgotPasswordUsername || undefined,
      });

      setForgotPasswordMessage(response.data.message);

      // In development, show the reset token
      if (response.data.resetToken) {
        setForgotPasswordMessage(
          `${response.data.message}\n\nDevelopment Reset Token: ${response.data.resetToken}`
        );
      }
    } catch (err: any) {
      setForgotPasswordMessage(
        err.response?.data?.error || 'Failed to send reset instructions'
      );
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const getErrorIcon = () => {
    switch (errorCode) {
      case 'USER_NOT_FOUND':
        return <Person color="error" />;
      case 'INVALID_PASSWORD':
        return <Lock color="error" />;
      default:
        return <Info color="error" />;
    }
  };

  const clearError = () => {
    setError(null);
    setErrorCode(null);
    setSuggestions([]);
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
          {import.meta.env.NODE_ENV === 'test' && (
            <Typography component='h2' variant='h6' align='center' gutterBottom sx={{ color: 'warning.main', fontWeight: 'bold' }}>
              TEST SYSTEM - Login
            </Typography>
          )}

          {error && (
            <Alert
              severity='error'
              sx={{
                mb: 2,
                width: '100%',
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
              icon={getErrorIcon()}
              onClose={clearError}
            >
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 'bold' }}>
                {error}
              </Typography>
              {suggestions.length > 0 && (
                <List dense sx={{ py: 0, mt: 1 }}>
                  {suggestions.map((suggestion, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <CheckCircle fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={suggestion}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Alert>
          )}

          <Box component='form' onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }} noValidate>
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
                // DO NOT clear error when typing - keep it visible
              }}
              disabled={isLoading}
              error={!username.trim() && error !== null}
              helperText={!username.trim() && error !== null ? 'Username is required' : ''}
              sx={{
                '& .MuiInputLabel-root': {
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  letterSpacing: 'normal'
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  letterSpacing: 'normal'
                },
                '& .MuiFormHelperText-root': {
                  color: 'error.main',
                  fontSize: '0.75rem',
                  marginTop: '4px'
                }
              }}
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
                // DO NOT clear error when typing - keep it visible
              }}
              disabled={isLoading}
              error={!password && error !== null}
              helperText={!password && error !== null ? 'Password is required' : ''}
              sx={{
                '& .MuiInputLabel-root': {
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  letterSpacing: 'normal'
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  letterSpacing: 'normal',
                  '&[type="password"]': {
                    fontFamily: 'monospace',
                    letterSpacing: '0.125em'
                  }
                },
                '& .MuiFormHelperText-root': {
                  color: 'error.main',
                  fontSize: '0.75rem',
                  marginTop: '4px'
                },
                '& .MuiInputBase-root': {
                  backgroundColor: 'background.paper'
                }
              }}
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

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setShowForgotPassword(true)}
                sx={{ cursor: 'pointer' }}
              >
                Forgot Password?
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Forgot Password Dialog */}
      <Dialog
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter your email address or username to receive password reset instructions.
          </Typography>

          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': {
                fontFamily: 'inherit',
                fontSize: '1rem',
                lineHeight: 1.5,
                letterSpacing: 'normal'
              },
              '& .MuiInputBase-input': {
                fontFamily: 'inherit',
                fontSize: '1rem',
                lineHeight: 1.5,
                letterSpacing: 'normal'
              }
            }}
            disabled={isForgotPasswordLoading}
          />

          <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
            OR
          </Typography>

          <TextField
            fullWidth
            label="Username"
            value={forgotPasswordUsername}
            onChange={(e) => setForgotPasswordUsername(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': {
                fontFamily: 'inherit',
                fontSize: '1rem',
                lineHeight: 1.5,
                letterSpacing: 'normal'
              },
              '& .MuiInputBase-input': {
                fontFamily: 'inherit',
                fontSize: '1rem',
                lineHeight: 1.5,
                letterSpacing: 'normal'
              }
            }}
            disabled={isForgotPasswordLoading}
          />

          {forgotPasswordMessage && (
            <Alert
              severity={forgotPasswordMessage.includes('Development Reset Token') ? 'info' : 'success'}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {forgotPasswordMessage}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowForgotPassword(false)}
            disabled={isForgotPasswordLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleForgotPassword}
            variant="contained"
            disabled={isForgotPasswordLoading}
            startIcon={isForgotPasswordLoading ? <CircularProgress size={16} /> : <Email />}
          >
            {isForgotPasswordLoading ? 'Sending...' : 'Send Reset Instructions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

console.log('Login.tsx - Exporting component');
export default Login;
