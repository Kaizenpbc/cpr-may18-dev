# API Versioning Strategy
## CPR Training System - Comprehensive API Version Management

### **Overview**
This document outlines the complete API versioning strategy for the CPR Training System, addressing version management, backward compatibility, deprecation policies, and migration strategies.

---

## **1. Versioning Strategy**

### **1.1 Versioning Scheme**
- **Semantic Versioning**: Following `MAJOR.MINOR.PATCH` format
- **Current Version**: `1.0.0` (v1)
- **API Endpoint Versioning**: `/api/v1/`, `/api/v2/`, etc.
- **Response Versioning**: All responses include version metadata

### **1.2 Version Types**
```typescript
interface ApiVersion {
  major: number;        // Breaking changes
  minor: number;        // Feature additions (backward compatible)
  patch: number;        // Bug fixes (backward compatible)
  status: 'active' | 'deprecated' | 'sunset';
  releaseDate: string;
  deprecationDate?: string;
  sunsetDate?: string;
}
```

### **1.3 Breaking vs Non-Breaking Changes**

**Breaking Changes (Major Version Bump):**
- Removing endpoints or fields
- Changing response structure
- Modifying authentication requirements
- Changing data types
- Altering error codes/formats

**Non-Breaking Changes (Minor/Patch Version):**
- Adding new endpoints
- Adding optional fields
- Improving performance
- Bug fixes
- Adding new optional headers

---

## **2. Version Detection Methods**

### **2.1 Multiple Detection Strategies**
1. **URL Path** (Primary): `/api/v1/users`
2. **Header** (Secondary): `API-Version: v1`
3. **Query Parameter** (Fallback): `?version=v1`
4. **Accept Header** (Content Negotiation): `Accept: application/vnd.api+json;version=1`

### **2.2 Priority Order**
```
1. URL Path (/api/v1/)
2. API-Version Header
3. Accept Header version parameter
4. Query parameter (?version=)
5. Default to latest stable version
```

---

## **3. Lifecycle Management**

### **3.1 Version Lifecycle Stages**

| Stage | Duration | Description | Client Action Required |
|-------|----------|-------------|----------------------|
| **Development** | 2-4 weeks | Internal testing | None |
| **Beta** | 2-4 weeks | Limited release | Optional testing |
| **Active** | 12+ months | Full production | Use normally |
| **Deprecated** | 6-12 months | Still supported, but discouraged | Plan migration |
| **Sunset** | 1-3 months | Grace period before removal | Migrate immediately |
| **Removed** | - | No longer available | Must use newer version |

### **3.2 Support Policy**
- **Active Support**: Latest 2 major versions
- **Security Support**: Latest 3 major versions
- **Minimum Notice**: 6 months for deprecation, 3 months for sunset

---

## **4. Implementation Architecture**

### **4.1 Version Middleware Stack**
```typescript
app.use('/api', [
  versionDetectionMiddleware,
  versionValidationMiddleware,
  deprecationWarningMiddleware,
  versionRoutingMiddleware
]);
```

### **4.2 Route Organization**
```
/src/routes/
├── index.ts                 # Main router with version detection
├── versions/
│   ├── v1/
│   │   ├── index.ts        # v1 routes
│   │   ├── auth/           # v1 auth endpoints
│   │   ├── courses/        # v1 course endpoints
│   │   └── ...
│   ├── v2/
│   │   ├── index.ts        # v2 routes (when available)
│   │   └── ...
│   └── shared/             # Shared utilities across versions
├── middleware/
│   ├── versionDetection.ts
│   ├── deprecation.ts
│   └── migration.ts
└── utils/
    ├── versionConfig.ts
    └── responseBuilder.ts
```

---

## **5. Response Format Standards**

### **5.1 Standardized Response Structure**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    traceId?: string;
  };
  meta: {
    timestamp: string;
    version: string;
    apiVersion: string;        // NEW: Explicit API version
    deprecation?: {            // NEW: Deprecation info
      isDeprecated: boolean;
      deprecationDate: string;
      sunsetDate: string;
      migrationGuide: string;
    };
    requestId?: string;
    pagination?: PaginationMeta;
  };
}
```

### **5.2 Version Headers**
```typescript
// Response Headers
{
  'API-Version': 'v1',
  'API-Supported-Versions': 'v1,v2',
  'API-Deprecated-Versions': 'v0',
  'API-Latest-Version': 'v2',
  'Deprecation': 'true',                    // RFC 8594
  'Sunset': 'Sun, 01 Jan 2025 00:00:00 GMT'  // RFC 8594
}
```

---

## **6. Client Communication Strategy**

### **6.1 Deprecation Warnings**
```typescript
// Graduated Warning System
interface DeprecationWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
  migrationGuide: string;
  timeRemaining: string;
  newVersion: string;
}
```

### **6.2 Migration Documentation**
- **Breaking Changes Guide**: Detailed list of changes per version
- **Migration Scripts**: Automated tools where possible
- **Code Examples**: Before/after examples for each change
- **Testing Guides**: How to test the migration

---

## **7. Backend Implementation Strategy**

### **7.1 Version Configuration**
```typescript
// config/versions.ts
export const API_VERSIONS = {
  v1: {
    major: 1,
    minor: 0,
    patch: 0,
    status: 'active',
    releaseDate: '2024-01-01',
    features: ['auth', 'courses', 'users', 'organizations'],
    deprecationDate: null,
    sunsetDate: null
  }
  // Future versions...
};
```

### **7.2 Version-Specific Controllers**
```typescript
// Separate controllers per version to avoid conflicts
/controllers/
├── v1/
│   ├── AuthController.ts
│   ├── CourseController.ts
│   └── ...
└── v2/
    ├── AuthController.ts  # Different implementation
    ├── CourseController.ts
    └── ...
```

---

## **8. Database Schema Versioning**

### **8.1 Schema Migration Strategy**
- **Backward Compatible**: New versions don't break old schema
- **Additive Changes**: Add new columns/tables, don't remove
- **View Layers**: Use database views for version-specific data shapes
- **Migration Scripts**: Automated schema updates per API version

### **8.2 Data Transformation**
```typescript
// Version-specific data transformers
interface DataTransformer {
  transformRequest: (data: any, targetVersion: string) => any;
  transformResponse: (data: any, clientVersion: string) => any;
}
```

---

## **9. Testing Strategy**

### **9.1 Version Compatibility Testing**
- **Regression Tests**: Ensure old versions still work
- **Migration Tests**: Validate smooth transitions
- **Performance Tests**: Check version overhead
- **Contract Tests**: API contract validation per version

### **9.2 Automated Testing**
```typescript
// Example test structure
describe('API Version Compatibility', () => {
  test('v1 endpoints maintain backward compatibility');
  test('deprecated versions return proper warnings');
  test('version detection works correctly');
  test('migration paths function properly');
});
```

---

## **10. Monitoring & Analytics**

### **10.1 Version Usage Tracking**
```typescript
interface VersionMetrics {
  version: string;
  requestCount: number;
  uniqueClients: number;
  errorRate: number;
  averageResponseTime: number;
  lastUsed: string;
}
```

### **10.2 Deprecation Metrics**
- Track which clients are using deprecated versions
- Monitor migration progress
- Alert on high usage of soon-to-be-sunset versions
- Generate migration reports for stakeholders

---

## **11. Implementation Phases**

### **Phase 1: Foundation (Week 1-2)**
✅ **Completed:**
- Enhanced version detection middleware
- Centralized version configuration
- Standardized response format with version metadata
- Basic deprecation warning system

### **Phase 2: Advanced Features (Week 3-4)**
🔄 **In Progress:**
- Content negotiation support
- Migration utilities
- Version-specific error handling
- Client SDK generation

### **Phase 3: Monitoring & Documentation (Week 5-6)**
📋 **Planned:**
- Version usage analytics
- Automated documentation generation
- Migration testing framework
- Client communication tools

### **Phase 4: Advanced Lifecycle Management (Week 7-8)**
📋 **Planned:**
- Automated deprecation workflows
- A/B testing framework for new versions
- Performance optimization per version
- Advanced client migration tools

---

## **12. Best Practices**

### **12.1 Development Guidelines**
1. **Design for Backward Compatibility**: Always assume clients won't upgrade immediately
2. **Gradual Rollouts**: Use feature flags and gradual deployment
3. **Comprehensive Testing**: Test all supported versions
4. **Clear Communication**: Provide detailed migration guides
5. **Monitor Usage**: Track version adoption and plan accordingly

### **12.2 Client Guidelines**
1. **Explicit Version Specification**: Always specify the API version
2. **Handle Deprecation Warnings**: Monitor and respond to deprecation notices
3. **Regular Updates**: Don't wait until sunset to migrate
4. **Test Migrations**: Thoroughly test new versions before switching
5. **Error Handling**: Handle version-related errors gracefully

---

## **13. Examples & Use Cases**

### **13.1 Version Request Examples**
```bash
# URL-based versioning (preferred)
GET /api/v1/courses

# Header-based versioning
GET /api/courses
API-Version: v1

# Query parameter (fallback)
GET /api/courses?version=v1

# Content negotiation
GET /api/courses
Accept: application/vnd.api+json;version=1
```

### **13.2 Response Examples**
```json
{
  "success": true,
  "data": { "courses": [...] },
  "meta": {
    "timestamp": "2024-12-08T15:30:00Z",
    "version": "1.0.0",
    "apiVersion": "v1",
    "requestId": "req_12345",
    "deprecation": {
      "isDeprecated": false
    }
  }
}
```

---

## **14. Future Considerations**

### **14.1 GraphQL Versioning**
When implementing GraphQL:
- Schema versioning through field deprecation
- Version-specific resolvers
- Backward-compatible schema evolution

### **14.2 Microservices Versioning**
For microservice architecture:
- Service-level versioning
- API gateway version routing
- Cross-service compatibility matrix

### **14.3 Real-time API Versioning**
For WebSocket/SSE endpoints:
- Connection-level version negotiation
- Event versioning strategies
- Backward-compatible event handling

---

## **15. Contact & Support**

### **15.1 Version Support Team**
- **API Team**: api-team@company.com
- **Migration Support**: migration-help@company.com
- **Documentation**: docs@company.com

### **15.2 Resources**
- **API Documentation**: `/docs/api/v1/`
- **Migration Guides**: `/docs/migrations/`
- **Status Page**: `/status/versions/`
- **SDK Downloads**: `/sdks/`

---

**Last Updated**: December 8, 2024  
**Version**: 1.0.0  
**Next Review**: January 8, 2025 