// Logging configuration
export const LOG_CONFIG = {
  suppressAll: false,
  suppressWarnings: false,
  suppressErrors: false,
  suppressInfo: false,
  suppressDebug: false,
  allowedDomains: ['nswma.gov.jm'], // Add domains that should always be logged
};

// Check if current domain is in allowed list
export const isAllowedDomain = () => {
  const currentDomain = window.location.hostname;
  return LOG_CONFIG.allowedDomains.some(domain => currentDomain.includes(domain));
};

// Check if logging should be suppressed
export const shouldSuppress = (level: string) => {
  if (isAllowedDomain()) return false;
  
  if (LOG_CONFIG.suppressAll) return true;
  
  switch (level) {
    case 'warn':
      return LOG_CONFIG.suppressWarnings;
    case 'error':
      return LOG_CONFIG.suppressErrors;
    case 'info':
      return LOG_CONFIG.suppressInfo;
    case 'debug':
      return LOG_CONFIG.suppressDebug;
    default:
      return false;
  }
};

// Configure logging behavior
export const configureLogging = (config: Partial<typeof LOG_CONFIG>) => {
  Object.assign(LOG_CONFIG, config);
};

// Get current logging configuration
export const getLogConfig = () => ({ ...LOG_CONFIG }); 