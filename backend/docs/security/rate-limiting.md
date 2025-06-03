# API Rate Limiting Documentation

## Overview

The CPR Training System implements comprehensive API rate limiting to protect against DDoS attacks, brute force attempts, and resource abuse. This security measure was implemented as part of our commercial-grade security hardening.

**Implementation Date**: June 3, 2025  
**Status**: ✅ Fully Implemented & Tested  
**Test Results**: 4/4 tests passed

---

## Rate Limiting Strategy

### Three-Tier Protection Model

#### 1. **General API Rate Limiting**
- **Scope**: All `/api/v1/*` endpoints
- **Limit**: 100 requests per 15 minutes per IP
- **Purpose**: Prevents API flooding and general abuse
- **Headers**: `RateLimit-Policy: 100;w=900`

#### 2. **Authentication Rate Limiting**
- **Scope**: `/api/v1/auth/*` endpoints
- **Limit**: 5 attempts per hour per IP
- **Purpose**: Prevents brute force attacks on login/registration
- **Headers**: `RateLimit-Policy: 5;w=3600`

#### 3. **Registration Rate Limiting**
- **Scope**: Registration endpoints (configurable)
- **Limit**: 3 attempts per 24 hours per IP
- **Purpose**: Prevents account creation spam
- **Headers**: `RateLimit-Policy: 3;w=86400`

---

## Implementation Details

### Core Files

```
backend/src/middleware/rateLimiter.ts  # Rate limiting middleware
backend/src/index.ts                   # Application integration
```

### Dependencies

```json
{
  "express-rate-limit": "^7.1.5"
}
```

### Configuration

Rate limits are configured in `backend/src/middleware/rateLimiter.ts`:

```typescript
// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  standardHeaders: true,
  legacyHeaders: false
});

// Auth limiter  
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // attempts per window
  standardHeaders: true,
  legacyHeaders: false
});
```

---

## Security Features

### 1. **Violation Logging**
All rate limit violations are automatically logged with:
- IP address
- HTTP method and URL
- User-Agent string
- Timestamp
- Violation type (API_GENERAL, AUTH, REGISTRATION)

### 2. **Structured Error Responses**
Rate limit violations return consistent JSON responses:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from this IP, please try again later.",
    "retryAfter": "15 minutes"
  }
}
```

### 3. **Standard Headers**
Client applications receive rate limit information:
- `RateLimit-Policy`: Rate limit configuration
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window

### 4. **Bypass Configuration**
Critical endpoints like `/health` are excluded from rate limiting to ensure monitoring functionality.

---

## Testing & Validation

### Automated Test Suite

A comprehensive test suite validates all rate limiting functionality:

#### **Test 1: Basic API Rate Limiting**
- ✅ **PASSED**: Rate limit headers present
- ✅ **PASSED**: Proper policy configuration (100;w=900)
- ✅ **PASSED**: Remaining count decrements correctly

#### **Test 2: Auth Rate Limiting**  
- ✅ **PASSED**: Stricter limits applied (5;w=3600)
- ✅ **PASSED**: Authentication failures handled properly
- ✅ **PASSED**: Rate limit headers present

#### **Test 3: Rate Limit Violation**
- ✅ **PASSED**: Blocks after 5 failed attempts
- ✅ **PASSED**: Returns 429 status code
- ✅ **PASSED**: Proper error message displayed
- ✅ **PASSED**: Server logging captures violations

#### **Test 4: Health Check Bypass**
- ✅ **PASSED**: Health endpoint has no rate limiting
- ✅ **PASSED**: Monitoring functionality preserved

---

## Monitoring & Maintenance

### Log Monitoring

Rate limit violations appear in server logs as:

```
🚦 [RATE LIMIT] AUTH violation:
  IP: ::1
  Method: POST
  URL: /api/v1/auth/login
  User-Agent: Mozilla/5.0...
  Time: 2025-06-03T01:53:10.800Z
```

### Key Metrics to Monitor

1. **Violation Frequency**: High violation rates may indicate attacks
2. **False Positives**: Legitimate users being blocked
3. **Performance Impact**: Response time changes
4. **Memory Usage**: Rate limit storage overhead

### Recommended Monitoring Alerts

- **High Violation Rate**: >10 violations per minute
- **Persistent Attacker**: Same IP with >5 violations per hour
- **Service Impact**: Response times >500ms increase

---

## Configuration Management

### Environment-Based Tuning

Rate limits can be adjusted based on environment:

```typescript
const isProd = process.env.NODE_ENV === 'production';
const baseLimit = isProd ? 50 : 100; // Stricter in production
```

### Custom Rate Limiters

Create specific limits for new endpoints:

```typescript
const emailLimiter = createCustomLimiter(
  60 * 60 * 1000, // 1 hour window
  10,             // 10 requests max
  'EMAIL_SEND'    // violation type
);

app.use('/api/v1/send-email', emailLimiter, emailRoutes);
```

---

## Troubleshooting

### Common Issues

#### **Issue**: Legitimate users being blocked
**Solution**: Review and adjust rate limits in `rateLimiter.ts`

#### **Issue**: Rate limiting not working
**Symptoms**: No rate limit headers in responses
**Solution**: Verify middleware order in `index.ts`

#### **Issue**: Performance degradation  
**Symptoms**: Slow response times
**Solution**: Consider Redis-backed storage for distributed systems

### Debug Mode

Enable detailed logging by setting:
```bash
DEBUG=rate-limit:* npm run dev
```

---

## Future Enhancements

### Planned Improvements

1. **Redis Backend**: For distributed rate limiting across multiple servers
2. **IP Whitelisting**: Allow trusted IPs to bypass limits
3. **User-Based Limits**: Rate limit by user ID instead of just IP
4. **Dynamic Limits**: Adjust limits based on server load
5. **Rate Limit Analytics**: Dashboard for violation trends

### Integration Considerations

- **Load Balancers**: Ensure consistent IP forwarding
- **CDN**: Consider rate limiting at edge locations
- **Mobile Apps**: Implement exponential backoff for retries

---

## Security Benefits

### Attack Protection

✅ **DDoS Protection**: Prevents API flooding attacks  
✅ **Brute Force Prevention**: Limits login attempt abuse  
✅ **Registration Spam**: Prevents account creation abuse  
✅ **Resource Conservation**: Protects server from overload  
✅ **Audit Trail**: Logs all violations for analysis  

### Compliance

Rate limiting helps meet security standards:
- **SOC 2**: Demonstrates access controls
- **ISO 27001**: Shows technical safeguards
- **OWASP**: Addresses A06:2021 – Vulnerable and Outdated Components

---

## API Documentation

### Rate Limit Headers

All API responses include rate limiting information:

| Header | Description | Example |
|--------|-------------|---------|
| `RateLimit-Policy` | Limit configuration | `100;w=900` |
| `RateLimit-Limit` | Maximum requests | `100` |
| `RateLimit-Remaining` | Requests remaining | `95` |

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `RATE_LIMIT_EXCEEDED` | General API limit | Wait 15 minutes |
| `AUTH_RATE_LIMIT_EXCEEDED` | Auth limit reached | Wait 1 hour |
| `REGISTER_RATE_LIMIT_EXCEEDED` | Registration limit | Wait 24 hours |

---

**Documentation Version**: 1.0  
**Last Updated**: June 3, 2025  
**Next Review**: July 3, 2025 