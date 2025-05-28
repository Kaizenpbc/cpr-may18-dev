# CPR Training Management System

A comprehensive web-based system for managing CPR training courses, instructors, students, and billing.

## Overview

The CPR Training Management System is a full-stack application designed to streamline the management of CPR training operations. It provides role-based portals for different user types, automated scheduling, billing management, and comprehensive reporting.

## Features

### Core Features
- **Multi-Portal System**: Separate interfaces for Organizations, Instructors, Course Admins, Accounting, Admin, and System Admin
- **Course Management**: Request, schedule, and track CPR training courses
- **Instructor Management**: Availability tracking, assignment, and performance monitoring
- **Student Management**: Registration, attendance tracking, and certification management
- **Billing & Invoicing**: Automated invoice generation, payment tracking, and financial reporting
- **Real-time Updates**: Automatic status updates and notifications

### Recent Implementations

#### 1. Bills Payable Portal (Organization)
- View and manage invoices with status tracking (Pending, Overdue, Payment Submitted, Paid)
- Submit payment information with reference numbers and notes
- PDF invoice preview and download
- Payment history tracking
- Dashboard with summary cards showing invoice statistics

#### 2. Automated Invoice Management
- **Scheduled Jobs**: Daily automatic update of overdue invoices (runs at 1:00 AM)
- **Manual Trigger**: Admin/Accountant can manually trigger overdue updates via API
- **Status Tracking**: Automatic status transitions based on payment and due dates

#### 3. Payment Verification Workflow
- Organizations submit payment information
- Accounting team reviews and verifies payments
- Automatic invoice status updates upon verification
- Audit trail for all payment activities

## Technology Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** for REST API
- **PostgreSQL** for database
- **JWT** for authentication
- **node-cron** for scheduled jobs
- **Puppeteer** for PDF generation

### Frontend
- **React** with **TypeScript**
- **Material-UI** for components
- **React Query** for data fetching
- **React Router** for navigation
- **Recharts** for data visualization

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd cpr-may18
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Configure environment variables:
Create a `.env` file in the backend directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=cpr_may18
JWT_SECRET=your_jwt_secret
```

4. Initialize the database:
The database will be automatically initialized when you first start the backend server.

5. Start the development servers:
```bash
# From the root directory
npm run dev

# Or start separately:
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm run dev
```

## User Roles and Portals

### 1. Organization Portal
- Request CPR courses
- Upload student lists
- View course history
- **Bills Payable**: View invoices, submit payments, track payment status
- Analytics dashboard

### 2. Instructor Portal
- Manage availability
- View assigned classes
- Mark attendance
- Complete courses
- View teaching history

### 3. Course Admin Portal
- Review course requests
- Assign instructors
- Schedule courses
- Monitor course completion
- Mark courses ready for billing

### 4. Accounting Portal
- Course pricing management
- Invoice generation and management
- Payment verification
- Financial reporting
- Revenue tracking

### 5. Admin Portal
- User management
- System monitoring
- Instructor performance tracking
- Manual overdue invoice updates

### 6. System Admin Portal
- Course type definitions
- User management
- Organization management
- Vendor management
- System configuration

## API Documentation

### Authentication
All API endpoints require JWT authentication except for login endpoints.

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token

#### Organization Endpoints
- `GET /api/v1/organization/courses` - Get organization's courses
- `POST /api/v1/organization/course-request` - Request a new course
- `GET /api/v1/organization/invoices` - Get organization's invoices
- `POST /api/v1/organization/invoices/:id/payment-submission` - Submit payment information
- `GET /api/v1/organization/billing-summary` - Get billing dashboard summary

#### Accounting Endpoints
- `GET /api/v1/accounting/billing-queue` - Get courses ready for billing
- `POST /api/v1/accounting/invoices` - Create invoice from course
- `GET /api/v1/accounting/payment-verifications` - Get pending payment verifications
- `POST /api/v1/accounting/payments/:id/verify` - Approve/reject payment
- `POST /api/v1/accounting/trigger-overdue-update` - Manually trigger overdue invoice update

## Database Schema

### Key Tables
- `users` - System users with role-based access
- `organizations` - Client organizations
- `course_requests` - Course requests from organizations
- `course_students` - Students enrolled in courses
- `invoices` - Generated invoices
- `payments` - Payment records with verification workflow
- `instructor_availability` - Instructor schedule availability
- `course_pricing` - Pricing configuration per organization/course type

## Scheduled Jobs

### Overdue Invoice Update
- **Schedule**: Daily at 1:00 AM
- **Function**: Automatically marks invoices as overdue when past due date
- **Manual Trigger**: Available via `/api/v1/accounting/trigger-overdue-update`

## Development Guidelines

### Code Structure
```
cpr-may18/
├── backend/
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx         # App entry point
│   └── package.json
└── README.md
```

### Best Practices
1. Use TypeScript for type safety
2. Follow RESTful API conventions
3. Implement proper error handling
4. Use database transactions for data integrity
5. Add appropriate logging for debugging
6. Write clear commit messages

## Testing

### Manual Testing Checklist
1. User authentication and authorization
2. Course request and approval workflow
3. Instructor assignment and scheduling
4. Student upload and attendance marking
5. Invoice generation and posting
6. Payment submission and verification
7. Scheduled job execution

## Deployment

### Production Considerations
1. Set up proper environment variables
2. Configure production database
3. Set up SSL certificates
4. Configure proper CORS settings
5. Set up monitoring and logging
6. Configure backup strategies
7. Set up email service for notifications

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill all Node processes
   taskkill /F /IM node.exe  # Windows
   killall node              # Linux/Mac
   ```

2. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure database exists

3. **Authentication Errors**
   - Clear browser cookies
   - Check JWT token expiration
   - Verify user credentials

## Future Enhancements

1. **Email Notifications**
   - Automated reminders for upcoming due dates
   - Payment confirmation emails
   - Course completion certificates

2. **Mobile Application**
   - Native mobile apps for instructors
   - Student check-in via mobile

3. **Advanced Analytics**
   - Predictive analytics for course demand
   - Instructor performance metrics
   - Financial forecasting

4. **Integration Features**
   - QuickBooks integration
   - Calendar synchronization
   - SMS notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team.
