# CPR Training Management System - System Overview

| Document Info | |
|---------------|---|
| **Version** | 1.0 |
| **Last Updated** | January 2026 |
| **Type** | System Overview |

---

## 1. Executive Summary

The CPR Training Management System is a comprehensive web application designed to manage the complete lifecycle of CPR certification training courses. It connects organizations needing training, instructors who deliver courses, accountants managing billing, vendors providing services, and HR managing payroll.

---

## 2. Business Purpose

### 2.1 Problem Statement
Managing CPR training operations involves coordinating multiple parties:
- Organizations requesting courses for their employees
- Instructors available to teach
- Scheduling and logistics
- Billing and payment collection
- Vendor invoice management
- Instructor payroll

Without a centralized system, this requires manual coordination via email, spreadsheets, and paper invoices - leading to errors, delays, and lost revenue.

### 2.2 Solution
A unified platform where each stakeholder has their own portal with role-specific functionality, connected through automated workflows for scheduling, billing, and payments.

---

## 3. User Roles & Portals

The system supports **7 distinct user roles**, each with a dedicated portal:

### 3.1 Organization Portal
**Users:** Companies/organizations needing CPR training for employees

**Key Functions:**
- Request CPR courses (specify date, location, student count)
- View scheduled and completed courses
- Manage enrolled students
- View and pay invoices (Bills Payable)
- Track payment history
- View course pricing

### 3.2 Instructor Portal
**Users:** Certified CPR instructors

**Key Functions:**
- View assigned courses and schedule
- Set availability calendar
- Mark student attendance
- View students enrolled in courses
- Track certifications issued
- View payment/earnings information

### 3.3 Course Admin Portal
**Users:** Administrative staff managing courses

**Key Functions:**
- View and manage all course requests
- Assign instructors to courses
- Schedule classes
- Manage instructor roster
- Handle course cancellations
- Manage email templates
- Approve vendor invoices

### 3.4 Accounting Portal
**Users:** Accountants and billing staff

**Key Functions:**
- Process billing queue (create invoices from completed courses)
- Review and approve pending invoices
- Manage organization receivables
- Track payments and aging
- Process vendor invoices
- Manage course pricing rules

### 3.5 Vendor Portal
**Users:** External vendors providing services

**Key Functions:**
- Submit invoices (PDF upload with OCR)
- Track invoice status
- View payment history
- Update vendor profile

### 3.6 HR Portal
**Users:** Human Resources staff

**Key Functions:**
- Review instructor timesheets
- Process payroll
- Manage instructor pay rates
- Track profile changes
- Handle payment requests

### 3.7 SuperAdmin / SysAdmin Portals
**Users:** System administrators

**Key Functions:**
- Manage organizations and users
- Configure course types
- Set system-wide pricing
- Monitor system health
- Security configuration

---

## 4. Core Workflows

### 4.1 Course Request to Completion

```
┌─────────────────┐
│ Organization    │
│ Requests Course │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Admin Reviews   │
│ & Schedules     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Instructor      │
│ Assigned        │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Course Held     │
│ Attendance      │
│ Marked          │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Course          │
│ Completed       │
└─────────────────┘
```

### 4.2 Billing & Payment

```
┌─────────────────┐
│ Course          │
│ Completed       │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Appears in      │
│ Billing Queue   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Accountant      │
│ Creates Invoice │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Pending         │
│ Approval        │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Approved &      │
│ Posted to Org   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Org Views in    │
│ Bills Payable   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Org Submits     │
│ Payment         │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Accountant      │
│ Verifies        │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Invoice Marked  │
│ Paid            │
└─────────────────┘
```

### 4.3 Vendor Invoice Processing

```
┌─────────────────┐
│ Vendor Uploads  │
│ PDF Invoice     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ OCR Extracts    │
│ Invoice Data    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Admin Reviews   │
│ Approve/Reject  │
└────────┬────────┘
         │
    ┌────┴────┐
    v         v
┌───────┐ ┌────────┐
│Approve│ │ Reject │
└───┬───┘ └────────┘
    │
    v
┌─────────────────┐
│ Sent to         │
│ Accounting      │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Payment         │
│ Processed       │
└─────────────────┘
```

### 4.4 Instructor Payroll

```
┌─────────────────┐
│ Instructor      │
│ Submits         │
│ Timesheet       │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ HR Reviews      │
│ Approve/Reject  │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Payroll         │
│ Calculated      │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Payment         │
│ Processed       │
└─────────────────┘
```

---

## 5. Key Features

### 5.1 Scheduling & Course Management
- Course request and approval workflow
- Instructor availability calendar
- Automatic conflict detection
- Course capacity management
- Cancellation handling

### 5.2 Billing & Invoicing
- Automatic invoice generation from completed courses
- Invoice approval workflow
- Multiple payment methods
- Payment tracking and reconciliation
- Aging reports

### 5.3 Vendor Management
- PDF invoice upload with OCR
- Automatic data extraction
- Multi-stage approval workflow
- Payment tracking

### 5.4 Certification Tracking
- Automatic certification generation
- Expiration date tracking
- Certification history

### 5.5 Reporting & Analytics
- Course completion trends
- Revenue reports
- Instructor workload
- Payment aging
- Organizational analytics

### 5.6 Notifications
- Email notifications (customizable templates)
- In-app real-time notifications
- Course confirmations
- Payment reminders
- Invoice alerts

---

## 6. Data Entities

### Primary Entities

| Entity | Description |
|--------|-------------|
| **Organization** | Company/entity requesting training |
| **User** | System user (any role) |
| **Instructor** | User with instructor role |
| **Course Request** | Request for a training course |
| **Class** | Scheduled training session |
| **Student** | Individual enrolled in a course |
| **Invoice** | Bill sent to organization |
| **Payment** | Payment against an invoice |
| **Vendor** | External service provider |
| **Vendor Invoice** | Invoice submitted by vendor |
| **Timesheet** | Instructor hours submission |
| **Certification** | Certificate issued to student |

### Entity Relationships

```
Organization ──┬── Course Requests ──── Classes ──── Students
               │
               └── Invoices ──── Payments

Instructor ──┬── Classes (assigned)
             │
             └── Timesheets ──── Payroll Payments

Vendor ──── Vendor Invoices ──── Vendor Payments
```

---

## 7. Security Model

### 7.1 Authentication
- JWT-based token authentication
- Refresh token rotation
- Session management
- Optional MFA support

### 7.2 Authorization
- Role-based access control (RBAC)
- Portal-level isolation
- API endpoint protection
- Organization data isolation

### 7.3 Data Protection
- Password hashing (bcrypt)
- Sensitive field encryption
- Audit logging
- Soft deletes for data recovery

---

## 8. Integration Points

| Integration | Purpose |
|-------------|---------|
| **Email (SMTP)** | Notifications, invoices |
| **Google Cloud Vision** | OCR for vendor invoices |
| **Google Cloud Storage** | File uploads |
| **Redis** | Session caching |
| **PostgreSQL** | Primary database |

---

## 9. Glossary

| Term | Definition |
|------|------------|
| **Course Request** | Organization's request for a training course |
| **Billing Queue** | List of completed courses ready for invoicing |
| **Bills Payable** | Organization's view of invoices owed |
| **Accounts Receivable** | Accountant's view of outstanding invoices |
| **Posted to Org** | Invoice made visible to organization |
| **Approval Status** | Invoice review state (pending/approved/rejected) |
| **OCR** | Optical Character Recognition (PDF text extraction) |

---

## 10. Related Documents

- [Architecture Document](./ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Invoice Approval Workflow](./invoice-approval-workflow.md)
