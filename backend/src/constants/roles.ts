// Role constants to prevent typos and ensure consistency
export const ROLES = {
  SUPERADMIN: 'superadmin',
  SYSADMIN: 'sysadmin',
  ADMIN: 'admin',
  COURSEADMIN: 'courseadmin',
  ACCOUNTANT: 'accountant',
  INSTRUCTOR: 'instructor',
  VENDOR: 'vendor',
  ORGANIZATION: 'organization',
  HR: 'hr',
  STUDENT: 'student'
} as const;

// Role hierarchy for access control
export const ROLE_HIERARCHY = {
  [ROLES.SUPERADMIN]: 10,
  [ROLES.SYSADMIN]: 9,
  [ROLES.ADMIN]: 8,
  [ROLES.COURSEADMIN]: 7,
  [ROLES.ACCOUNTANT]: 6,
  [ROLES.INSTRUCTOR]: 5,
  [ROLES.VENDOR]: 4,
  [ROLES.ORGANIZATION]: 3,
  [ROLES.HR]: 2,
  [ROLES.STUDENT]: 1
} as const;

// Helper function to check if user has required role
export const hasRole = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};

// Helper function to check if user has minimum role level
export const hasMinimumRole = (userRole: string, minimumRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
  const minimumLevel = ROLE_HIERARCHY[minimumRole as keyof typeof ROLE_HIERARCHY] || 0;
  return userLevel >= minimumLevel;
};

// Common role combinations
export const ROLE_COMBINATIONS = {
  ADMIN_ACCESS: [ROLES.ADMIN, ROLES.SYSADMIN, ROLES.COURSEADMIN],
  ACCOUNTING_ACCESS: [ROLES.ACCOUNTANT, ROLES.ADMIN],
  VENDOR_ACCESS: [ROLES.VENDOR],
  INSTRUCTOR_ACCESS: [ROLES.INSTRUCTOR],
  ORGANIZATION_ACCESS: [ROLES.ORGANIZATION],
  HR_ACCESS: [ROLES.HR, ROLES.SYSADMIN]
} as const; 