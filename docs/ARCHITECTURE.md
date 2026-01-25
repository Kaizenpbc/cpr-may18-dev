# CPR Training Management System - Architecture Document

| Document Info | |
|---------------|---|
| **Version** | 1.0 |
| **Last Updated** | January 2026 |
| **Type** | Technical Architecture |

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Browser  │  │ Browser  │  │ Browser  │  │ Browser  │   ...      │
│  │(Org User)│  │(Instruct)│  │(Account) │  │ (Vendor) │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │ HTTPS
                             v
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React SPA)                           │
│                         Port 5173 (dev)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  React Router → Portal Components → API Service Layer       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP/HTTPS (API calls)
                                v
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                      │
│                           Port 3001                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Middleware → Routes → Services → Database                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────┬──────────────────┬──────────────────┬──────────────────────┘
         │                  │                  │
         v                  v                  v
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│ PostgreSQL  │    │   Redis     │    │ External APIs   │
│  Database   │    │   Cache     │    │ (GCP, SMTP)     │
└─────────────┘    └─────────────┘    └─────────────────┘
```

### 1.2 Technology Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Material-UI |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Real-time** | Socket.io |
| **File Storage** | Google Cloud Storage |
| **OCR** | Google Cloud Vision API |
| **Email** | Nodemailer (SMTP) |

---

## 2. Project Structure

```
cpr-jun21-dev/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration modules
│   │   │   ├── database.ts   # PostgreSQL connection
│   │   │   ├── redis.ts      # Redis client
│   │   │   ├── security.ts   # Security settings
│   │   │   └── mfa.ts        # MFA configuration
│   │   ├── controllers/      # Request handlers
│   │   │   └── authController.ts
│   │   ├── middleware/       # Express middleware
│   │   │   ├── authMiddleware.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── validation.ts
│   │   │   └── security.ts
│   │   ├── routes/           # API route definitions
│   │   │   └── v1/
│   │   │       └── index.ts  # All v1 routes (~8000 lines)
│   │   ├── services/         # Business logic
│   │   │   ├── emailService.ts
│   │   │   ├── pdfService.ts
│   │   │   ├── ocrService.ts
│   │   │   └── notificationService.ts
│   │   ├── scripts/          # Initialization scripts
│   │   │   └── init-db.ts    # Database schema & migrations
│   │   ├── db/
│   │   │   ├── migrations/   # Schema versioning
│   │   │   └── seeds/        # Initial data
│   │   ├── models/           # Data models
│   │   ├── types/            # TypeScript definitions
│   │   ├── utils/            # Helper functions
│   │   └── index.ts          # Entry point
│   ├── dist/                 # Compiled output
│   ├── uploads/              # Uploaded files
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── portals/      # Role-based portal UIs
│   │   │   │   ├── AccountingPortal.tsx
│   │   │   │   ├── InstructorPortal.tsx
│   │   │   │   ├── OrganizationPortal.tsx
│   │   │   │   ├── VendorPortal.tsx
│   │   │   │   ├── HRPortal.tsx
│   │   │   │   ├── CourseAdminPortal.tsx
│   │   │   │   ├── SuperAdminPortal.tsx
│   │   │   │   └── SystemAdminPortal.tsx
│   │   │   ├── common/       # Shared components
│   │   │   ├── forms/        # Form components
│   │   │   ├── tables/       # Data tables
│   │   │   ├── dialogs/      # Modal dialogs
│   │   │   ├── views/        # View components
│   │   │   └── auth/         # Auth components
│   │   ├── contexts/         # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   └── NotificationContext.tsx
│   │   ├── services/         # API service layer
│   │   │   └── api.ts
│   │   ├── pages/            # Page components
│   │   ├── utils/            # Utilities
│   │   └── App.tsx           # Main app component
│   └── package.json
│
├── docs/                     # Documentation
├── .github/                  # CI/CD workflows
├── docker-compose.yml        # Container orchestration
└── package.json              # Root workspace
```

---

## 3. Backend Architecture

### 3.1 Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP Request                         │
└───────────────────────────┬─────────────────────────────┘
                            v
┌─────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ Helmet  │  │  CORS   │  │  Auth   │  │  Rate   │   │
│  │(Security)│ │         │  │  JWT    │  │ Limiter │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└───────────────────────────┬─────────────────────────────┘
                            v
┌─────────────────────────────────────────────────────────┐
│                     ROUTE LAYER                         │
│  Routes define endpoints and map to handlers            │
│  /api/v1/auth, /api/v1/instructor, /api/v1/org, etc.   │
└───────────────────────────┬─────────────────────────────┘
                            v
┌─────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                        │
│  Business logic, data transformation, external APIs     │
│  emailService, pdfService, ocrService, etc.            │
└───────────────────────────┬─────────────────────────────┘
                            v
┌─────────────────────────────────────────────────────────┐
│                     DATA LAYER                          │
│  PostgreSQL queries via pg driver                       │
│  Redis for caching and sessions                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Middleware Stack

| Middleware | Purpose | Configuration |
|------------|---------|---------------|
| **Helmet** | Security headers | CSP, HSTS, X-Frame-Options |
| **CORS** | Cross-origin requests | Configurable origins |
| **express.json** | Body parsing | 50mb limit |
| **Rate Limiter** | DDoS protection | 100 req/15min general, 5/15min auth |
| **authenticateToken** | JWT verification | Bearer token required |
| **requireRole** | Role-based access | Portal-specific |
| **express-validator** | Input validation | Schema-based |

### 3.3 API Versioning

All APIs are versioned under `/api/v1/`:

```
/api/v1/
├── auth/                 # Authentication
├── instructor/           # Instructor operations
├── organization/         # Organization operations
├── accounting/           # Accounting operations
├── vendor/               # Vendor operations
├── hr/                   # HR operations
├── admin/                # Admin operations
├── sysadmin/             # System admin
├── health/               # Health checks
├── notifications/        # Notification system
└── email-templates/      # Email management
```

### 3.4 Error Handling

```typescript
// Standard error response format
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}

// Error codes
- AUTH_INVALID_CREDENTIALS
- AUTH_INSUFFICIENT_PERMISSIONS
- RESOURCE_NOT_FOUND
- VALIDATION_ERROR
- INTERNAL_SERVER_ERROR
```

---

## 4. Frontend Architecture

### 4.1 Component Hierarchy

```
App.tsx
├── AuthContext.Provider
│   ├── ThemeContext.Provider
│   │   ├── SnackbarContext.Provider
│   │   │   ├── NotificationProvider
│   │   │   │   └── Router
│   │   │   │       ├── LoginPage
│   │   │   │       ├── RoleBasedRouter
│   │   │   │       │   ├── InstructorPortal
│   │   │   │       │   ├── OrganizationPortal
│   │   │   │       │   ├── AccountingPortal
│   │   │   │       │   ├── VendorPortal
│   │   │   │       │   ├── HRPortal
│   │   │   │       │   ├── CourseAdminPortal
│   │   │   │       │   ├── SuperAdminPortal
│   │   │   │       │   └── SystemAdminPortal
```

### 4.2 State Management

| State Type | Solution | Use Case |
|------------|----------|----------|
| **Auth State** | React Context | User, tokens, role |
| **Theme** | React Context | Light/dark mode |
| **Server State** | React Query | API data caching |
| **Form State** | React Hook Form | Form handling |
| **UI State** | useState | Component-local state |
| **Notifications** | React Context | Toast messages |

### 4.3 API Service Layer

```typescript
// frontend/src/services/api.ts

// Axios instance with interceptors
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Attempt token refresh
    }
    return Promise.reject(error);
  }
);
```

### 4.4 Routing Structure

```typescript
// Role-based routing
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/instructor/*" element={<InstructorPortal />} />
  <Route path="/organization/*" element={<OrganizationPortal />} />
  <Route path="/accounting/*" element={<AccountingPortal />} />
  <Route path="/vendor/*" element={<VendorPortal />} />
  <Route path="/hr/*" element={<HRPortal />} />
  <Route path="/admin/*" element={<CourseAdminPortal />} />
  <Route path="/superadmin/*" element={<SuperAdminPortal />} />
  <Route path="/sysadmin/*" element={<SystemAdminPortal />} />
</Routes>
```

---

## 5. Database Architecture

### 5.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│  ORGANIZATIONS  │       │     USERS       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ organization_id │
│ name            │       │ id (PK)         │
│ contact_email   │       │ username        │
│ contact_phone   │       │ email           │
│ address         │       │ role            │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │                         │
         v                         v
┌─────────────────┐       ┌─────────────────┐
│ COURSE_REQUESTS │       │ INSTRUCTOR_     │
├─────────────────┤       │ AVAILABILITY    │
│ id (PK)         │       ├─────────────────┤
│ organization_id │       │ instructor_id   │
│ course_type_id  │       │ date            │
│ instructor_id   │       │ status          │
│ scheduled_date  │       └─────────────────┘
│ status          │
│ location        │
└────────┬────────┘
         │
         v
┌─────────────────┐       ┌─────────────────┐
│    INVOICES     │       │    PAYMENTS     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ invoice_id      │
│ organization_id │       │ id (PK)         │
│ course_request_ │       │ amount          │
│ invoice_number  │       │ payment_date    │
│ amount          │       │ status          │
│ approval_status │       └─────────────────┘
│ posted_to_org   │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    VENDORS      │       │ VENDOR_INVOICES │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ vendor_id       │
│ company_name    │       │ id (PK)         │
│ email           │       │ invoice_number  │
│ payment_method  │       │ amount          │
└─────────────────┘       │ status          │
                          │ pdf_filename    │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│   TIMESHEETS    │       │ PAYROLL_PAYMENTS│
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ instructor_id   │       │ instructor_id   │
│ week_start_date │       │ amount          │
│ total_hours     │       │ payment_date    │
│ status          │       │ status          │
└─────────────────┘       └─────────────────┘
```

### 5.2 Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **organizations** | Companies using the system | name, contact_email |
| **users** | All system users | username, role, organization_id |
| **class_types** | Course type definitions | name, duration_minutes |
| **course_requests** | Course requests/scheduling | organization_id, scheduled_date, status |
| **invoices** | Organization billing | invoice_number, amount, approval_status |
| **payments** | Payment records | invoice_id, amount, status |
| **vendors** | External vendors | company_name, email |
| **vendor_invoices** | Vendor billing | vendor_id, amount, status |
| **timesheets** | Instructor hours | instructor_id, total_hours |
| **course_pricing** | Per-org pricing | organization_id, price_per_student |

### 5.3 Database Initialization

```bash
# Initialize schema and run migrations
npm run db:init

# Process:
# 1. Create tables if not exist
# 2. Add columns for schema updates
# 3. Run data migrations
# 4. Create indexes
# 5. Set up foreign keys
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌──────────┐     POST /auth/login      ┌──────────┐
│  Client  │ ────────────────────────► │  Server  │
│          │   {username, password}    │          │
└──────────┘                           └────┬─────┘
                                            │
                                            v
                                    ┌───────────────┐
                                    │ Verify        │
                                    │ Credentials   │
                                    │ (bcrypt)      │
                                    └───────┬───────┘
                                            │
                                            v
                                    ┌───────────────┐
                                    │ Generate JWT  │
                                    │ + Refresh     │
                                    │ Token         │
                                    └───────┬───────┘
                                            │
┌──────────┐     {token, refresh}          │
│  Client  │ ◄──────────────────────────────┘
│          │
└──────────┘
```

### 6.2 JWT Token Structure

```javascript
// Access Token (15 min expiry)
{
  "userId": 123,
  "username": "john.doe",
  "role": "accountant",
  "organizationId": 5,
  "iat": 1706184000,
  "exp": 1706184900
}

// Refresh Token (7 day expiry)
{
  "userId": 123,
  "tokenVersion": 1,
  "iat": 1706184000,
  "exp": 1706788800
}
```

### 6.3 Authorization Matrix

| Endpoint | Organization | Instructor | Accountant | Admin | HR |
|----------|--------------|------------|------------|-------|-----|
| `/organization/*` | Yes | - | - | - | - |
| `/instructor/*` | - | Yes | - | - | - |
| `/accounting/*` | - | - | Yes | - | - |
| `/admin/*` | - | - | - | Yes | - |
| `/hr/*` | - | - | - | - | Yes |
| `/vendor/*` | - | - | - | - | - |

### 6.4 Security Headers (Helmet)

```javascript
// Content Security Policy
"default-src 'self'"
"script-src 'self'"
"style-src 'self' 'unsafe-inline'"
"img-src 'self' data: https:"

// Other Headers
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## 7. Integration Architecture

### 7.1 External Services

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION                          │
└───────────┬──────────────┬──────────────┬───────────────┘
            │              │              │
            v              v              v
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │  SMTP    │   │  Google  │   │  Google  │
     │  Server  │   │  Cloud   │   │  Cloud   │
     │ (Email)  │   │  Vision  │   │  Storage │
     └──────────┘   │  (OCR)   │   │ (Files)  │
                    └──────────┘   └──────────┘
```

### 7.2 Email Service

```typescript
// emailService.ts
- Send course confirmations
- Send invoice notifications
- Send payment reminders
- Send password reset links
- Template-based emails
```

### 7.3 OCR Service

```typescript
// ocrService.ts
- Extract text from PDF invoices
- Parse invoice number, amount, date
- Detect vendor from document
- Return structured data
```

### 7.4 PDF Service

```typescript
// pdfService.ts
- Generate invoice PDFs
- Generate payment receipts
- Use PDFKit for native generation
```

---

## 8. Caching Strategy

### 8.1 Redis Usage

| Use Case | TTL | Key Pattern |
|----------|-----|-------------|
| Session data | 24h | `session:{sessionId}` |
| User profile | 15m | `user:{userId}` |
| Course list | 5m | `courses:{orgId}` |
| Pricing data | 30m | `pricing:{orgId}:{courseType}` |
| Rate limiting | 15m | `ratelimit:{ip}:{endpoint}` |

### 8.2 Cache Invalidation

```typescript
// Invalidate on write operations
- User update → clear user cache
- Pricing update → clear pricing cache
- Course update → clear course cache
```

---

## 9. Real-time Communication

### 9.1 Socket.io Events

```typescript
// Server-to-client events
'notification:new'     // New notification
'invoice:status'       // Invoice status change
'course:update'        // Course status change

// Client-to-server events
'notification:read'    // Mark notification read
'subscribe:room'       // Join notification room
```

### 9.2 Connection Management

```typescript
// Connection authenticated via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT
  // Attach user to socket
});

// Room-based notifications
socket.join(`user:${userId}`);
socket.join(`org:${organizationId}`);
```

---

## 10. Deployment Architecture

### 10.1 Production Environment (Render)

```
┌─────────────────────────────────────────────────────────┐
│                      RENDER                             │
│  ┌─────────────────┐    ┌─────────────────┐            │
│  │  Web Service    │    │  Web Service    │            │
│  │  (Frontend)     │    │  (Backend)      │            │
│  │  Static Files   │    │  Node.js API    │            │
│  └────────┬────────┘    └────────┬────────┘            │
│           │                      │                      │
│           └──────────┬───────────┘                      │
│                      │                                  │
│           ┌──────────┴───────────┐                      │
│           │   PostgreSQL         │                      │
│           │   (Managed DB)       │                      │
│           └──────────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

### 10.2 Environment Variables

```bash
# Backend
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
GOOGLE_CLOUD_PROJECT=...
GOOGLE_APPLICATION_CREDENTIALS=...

# Frontend
VITE_API_URL=https://api.example.com
```

### 10.3 Build & Deploy

```bash
# Build
npm run build           # Builds both frontend and backend

# Backend build
cd backend && npm run build   # TypeScript → JavaScript

# Frontend build
cd frontend && npm run build  # Vite production build

# Start
npm run start           # Starts production server
```

---

## 11. Monitoring & Observability

### 11.1 Health Checks

| Endpoint | Checks |
|----------|--------|
| `/api/v1/health` | API responding |
| `/api/v1/health/database` | DB connection |
| `/api/v1/health/redis` | Redis connection |
| `/api/v1/health/ssl` | SSL certificate |

### 11.2 Logging

```typescript
// Winston logger configuration
- Console output (development)
- File output (production)
- Error level separation
- Request/response logging
- Audit trail logging
```

### 11.3 Metrics (Prometheus)

```
- http_requests_total
- http_request_duration_seconds
- database_query_duration
- active_connections
```

---

## 12. Development Workflow

### 12.1 Local Setup

```bash
# Clone repository
git clone <repo-url>
cd cpr-jun21-dev

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Initialize database
npm run db:init

# Start development
npm run dev
```

### 12.2 Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start both servers |
| `npm run dev:backend` | Backend only |
| `npm run dev:frontend` | Frontend only |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npm run lint` | Run linter |
| `npm run db:init` | Initialize DB |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed data |

---

## 13. Related Documents

- [System Overview](./SYSTEM_OVERVIEW.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Invoice Approval Workflow](./invoice-approval-workflow.md)
