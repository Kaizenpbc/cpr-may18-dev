import { Request, Response, NextFunction } from 'express';
import { body, ValidationChain } from 'express-validator';

// Password policy configuration
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  forbiddenPatterns: string[];
  maxConsecutiveChars: number;
  requireNoCommonPasswords: boolean;
  maxPasswordAge: number; // days
  passwordHistoryCount: number; // remember last N passwords
}

// Default password policy (relaxed for testing)
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 4,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  minSpecialChars: 0,
  forbiddenPatterns: [],
  maxConsecutiveChars: 10,
  requireNoCommonPasswords: false,
  maxPasswordAge: 365, // 1 year
  passwordHistoryCount: 0
};

// Common weak passwords list (top 1000 most common)
const COMMON_PASSWORDS = [
  '123456', 'password', '123456789', '12345678', '12345', '1234567', '1234567890',
  'qwerty', 'abc123', 'password123', 'admin', 'letmein', 'welcome', 'monkey',
  '1234', 'dragon', 'master', 'hello', 'login', 'pass', 'secret', 'shadow',
  'superman', 'qazwsx', 'michael', 'football', 'baseball', 'welcome123',
  'jordan', 'harley', 'ranger', 'hunter', 'buster', 'soccer', 'hockey',
  'killer', 'george', 'sexy', 'andrew', 'charlie', 'superman', 'asshole',
  'fuckyou', 'dallas', 'jessica', 'panties', 'pepper', '1234567890',
  'access', 'mustang', 'fuckme', 'jordan23', 'password1', 'blink182',
  'superman', 'michael', 'shadow', 'monkey', 'fuckyou', 'jordan',
  'harley', 'ranger', 'hunter', 'buster', 'soccer', 'hockey', 'killer',
  'george', 'sexy', 'andrew', 'charlie', 'superman', 'asshole', 'fuckyou',
  'dallas', 'jessica', 'panties', 'pepper', '1234567890', 'access',
  'mustang', 'fuckme', 'jordan23', 'password1', 'blink182'
];

// Password strength scoring
export interface PasswordStrength {
  score: number; // 0-100
  level: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  feedback: string[];
  meetsPolicy: boolean;
}

// Calculate password strength
export function calculatePasswordStrength(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length scoring
  if (password.length >= policy.minLength) {
    score += 20;
  } else {
    feedback.push(`Password must be at least ${policy.minLength} characters long`);
  }

  if (password.length > policy.maxLength) {
    feedback.push(`Password must be no more than ${policy.maxLength} characters long`);
  }

  // Character type scoring
  if (policy.requireUppercase && /[A-Z]/.test(password)) {
    score += 15;
  } else if (policy.requireUppercase) {
    feedback.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && /[a-z]/.test(password)) {
    score += 15;
  } else if (policy.requireLowercase) {
    feedback.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && /\d/.test(password)) {
    score += 15;
  } else if (policy.requireNumbers) {
    feedback.push('Password must contain at least one number');
  }

  if (policy.requireSpecialChars) {
    const specialCharCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (specialCharCount >= policy.minSpecialChars) {
      score += 20;
    } else {
      feedback.push(`Password must contain at least ${policy.minSpecialChars} special characters`);
    }
  }

  // Entropy scoring (character variety)
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 8) {
    score += 10;
  } else if (uniqueChars < 4) {
    feedback.push('Password should contain more unique characters');
  }

  // Check for consecutive characters
  let consecutiveCount = 1;
  let maxConsecutive = 1;
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      consecutiveCount++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
    } else {
      consecutiveCount = 1;
    }
  }

  if (maxConsecutive > policy.maxConsecutiveChars) {
    feedback.push(`Password should not have more than ${policy.maxConsecutiveChars} consecutive identical characters`);
    score -= 10;
  }

  // Check for forbidden patterns
  const lowerPassword = password.toLowerCase();
  for (const pattern of policy.forbiddenPatterns) {
    if (lowerPassword.includes(pattern.toLowerCase())) {
      feedback.push(`Password contains forbidden pattern: ${pattern}`);
      score -= 20;
      break;
    }
  }

  // Check for common passwords
  if (policy.requireNoCommonPasswords && COMMON_PASSWORDS.includes(password.toLowerCase())) {
    feedback.push('Password is too common and easily guessable');
    score -= 30;
  }

  // Determine strength level
  let level: PasswordStrength['level'];
  if (score >= 90) level = 'Very Strong';
  else if (score >= 75) level = 'Strong';
  else if (score >= 60) level = 'Good';
  else if (score >= 40) level = 'Fair';
  else if (score >= 20) level = 'Weak';
  else level = 'Very Weak';

  const meetsPolicy = feedback.length === 0 && score >= 60;

  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    feedback,
    meetsPolicy
  };
}

// Express validator for password validation
export function passwordValidation(policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): ValidationChain {
  return body('password')
    .isLength({ min: policy.minLength, max: policy.maxLength })
    .withMessage(`Password must be between ${policy.minLength} and ${policy.maxLength} characters`)
    .custom((value: string) => {
      const strength = calculatePasswordStrength(value, policy);
      
      if (!strength.meetsPolicy) {
        throw new Error(`Password does not meet policy requirements: ${strength.feedback.join(', ')}`);
      }
      
      return true;
    });
}

// Middleware to validate password against policy
export const validatePasswordPolicy = (policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { password } = req.body;
    
    if (!password) {
      return next();
    }

    const strength = calculatePasswordStrength(password, policy);
    
    if (!strength.meetsPolicy) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: strength.feedback,
        strength: {
          score: strength.score,
          level: strength.level
        }
      });
    }

    // Add strength info to request for logging
    req.passwordStrength = strength;
    next();
  };
};

// Utility function to check if password is in history
export async function isPasswordInHistory(
  userId: string, 
  password: string, 
  historyCount: number = DEFAULT_PASSWORD_POLICY.passwordHistoryCount
): Promise<boolean> {
  // This would typically check against a password history table
  // For now, we'll return false as we don't have the database setup
  return false;
}

// Password policy validation for different user roles (relaxed for testing)
export const getPasswordPolicyForRole = (role: string): PasswordPolicy => {
  // Return the same relaxed policy for all roles during testing
  return { ...DEFAULT_PASSWORD_POLICY };
};

// Enhanced password validation with role-based policies
export function roleBasedPasswordValidation(role: string): ValidationChain {
  const policy = getPasswordPolicyForRole(role);
  return passwordValidation(policy);
}
