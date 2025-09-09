import React, { forwardRef } from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useAccessibility } from '../../hooks/useAccessibility';

interface AccessibleTextFieldProps extends TextFieldProps {
  announceOnChange?: boolean;
  announceOnFocus?: boolean;
  announceOnBlur?: boolean;
  announceText?: string;
}

const AccessibleTextField = forwardRef<HTMLDivElement, AccessibleTextFieldProps>(
  ({ 
    announceOnChange = false,
    announceOnFocus = false,
    announceOnBlur = false,
    announceText,
    onChange,
    onFocus,
    onBlur,
    ...props 
  }, ref) => {
    const { announceToScreenReader } = useAccessibility();

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (announceOnChange && announceText) {
        announceToScreenReader(announceText);
      }
      
      if (onChange) {
        onChange(event);
      }
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      if (announceOnFocus && announceText) {
        announceToScreenReader(announceText);
      }
      
      if (onFocus) {
        onFocus(event);
      }
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      if (announceOnBlur && announceText) {
        announceToScreenReader(announceText);
      }
      
      if (onBlur) {
        onBlur(event);
      }
    };

    return (
      <TextField
        ref={ref}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
        sx={{
          '& .MuiOutlinedInput-root': {
            minHeight: '44px', // Minimum touch target size
            '&:focus-within': {
              outline: '2px solid #1976d2',
              outlineOffset: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            '&.Mui-focused': {
              color: '#1976d2',
            },
          },
          ...props.sx,
        }}
        InputProps={{
          ...props.InputProps,
          sx: {
            ...props.InputProps?.sx,
          },
        }}
        InputLabelProps={{
          ...props.InputLabelProps,
          sx: {
            ...props.InputLabelProps?.sx,
          },
        }}
      />
    );
  }
);

AccessibleTextField.displayName = 'AccessibleTextField';

export default AccessibleTextField;
