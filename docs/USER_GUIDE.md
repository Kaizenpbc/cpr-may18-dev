# CPR Training Management System - User Guide

## Table of Contents
1. [Instructor Portal](#instructor-portal)
2. [Organization Portal](#organization-portal)
3. [Course Admin Portal](#course-admin-portal)
4. [HR Portal](#hr-portal)
5. [Accounting Portal](#accounting-portal)
6. [Vendor Portal](#vendor-portal)
7. [System Admin Portal](#system-admin-portal)

---

# Instructor Portal

## Overview
The Instructor Portal allows instructors to manage their classes, track attendance, submit timesheets, and view payment history.

## Dashboard
When you log in, you'll see:
- **Today's Classes**: Classes scheduled for today
- **Quick Stats**: Overview of your teaching activity
- **Quick Actions**: Shortcuts to common tasks

## My Classes

### Viewing Your Schedule
1. Click **My Classes** in the navigation
2. See all your assigned classes with:
   - Date and time
   - Organization name
   - Location
   - Course type
   - Number of students

### Class Status
| Status | Meaning |
|--------|---------|
| **Confirmed** | Class is scheduled and ready |
| **Completed** | Class has been taught |
| **Cancelled** | Class was cancelled |

## Attendance

### Taking Attendance
1. Go to **My Classes**
2. Click on a confirmed class
3. Click **Take Attendance**
4. For each student:
   - Mark as **Present** or **Absent**
   - Add any notes if needed
5. Click **Save Attendance**

### Completing a Class
After taking attendance:
1. Review all student attendance
2. Click **Complete Class**
3. The class moves to "Completed" status

## Timesheet Management

### Submitting a Timesheet
1. Go to **Timesheet Management**
2. Select the week (defaults to previous week)
3. Review auto-calculated fields:
   - **Teaching Hours**: Calculated from your class times
   - **Courses Taught**: Number of completed classes
4. Add additional hours:
   - **Travel Time**: Hours spent traveling
   - **Prep Time**: Hours spent preparing
5. Add any **Notes** (optional)
6. Click **Submit Timesheet**

### Timesheet Rules
- Submit timesheets **after** the week ends (Mon-Sun)
- One timesheet per week
- Late submissions (past weeks) are flagged for HR review

### Viewing Timesheet History
1. Go to **Timesheet Management** → **Timesheet History** tab
2. See all your submitted timesheets with:
   - Week
   - Status (Pending, Approved, Rejected)
   - Hours
   - HR comments

### Payment History
1. Go to **Timesheet Management** → **Payment History** tab
2. See your payment status:

| Status | Meaning |
|--------|---------|
| **Pending** | Timesheet submitted, awaiting HR approval |
| **Approved** | HR approved, payment being processed |
| **Paid** | Payment has been sent |

## My Schedule
View your upcoming classes in a calendar format:
- Monthly/weekly views
- Color-coded by status
- Click any class for details

## Availability
Set your available times for scheduling:
1. Go to **Availability**
2. Select days and times you're available
3. Save your availability

---

# Organization Portal

## Overview
The Organization Portal allows organizations to request courses, manage students, view invoices, and track billing.

## Dashboard
When you log in, you'll see:
- **Upcoming Courses**: Your scheduled classes
- **Recent Activity**: Latest updates
- **Quick Stats**: Course and billing summary

## Course Requests

### Requesting a New Course
1. Go to **Course Requests**
2. Click **New Request**
3. Fill in:
   - **Course Type**: Select the type of training
   - **Preferred Date(s)**: When you'd like the class
   - **Expected Students**: Number of participants
   - **Location**: Where the class will be held
   - **Notes**: Any special requirements
4. Click **Submit Request**

### Request Status
| Status | Meaning |
|--------|---------|
| **Pending** | Waiting for admin to schedule |
| **Confirmed** | Class is scheduled with instructor |
| **Completed** | Class has been delivered |
| **Invoiced** | Invoice has been generated |

### Viewing Your Courses
1. Go to **My Courses**
2. See all your courses with:
   - Date and time
   - Instructor name
   - Location
   - Status

## Student Management

### Adding Students to a Course
1. Go to **My Courses**
2. Click on a course
3. Click **Manage Students**
4. Add students:
   - Enter name and email
   - Or upload a CSV file
5. Save changes

### Viewing Student Results
After a class is completed:
1. Go to **My Courses**
2. Click on a completed course
3. View attendance and results for each student

## Billing & Invoices

### Viewing Invoices
1. Go to **Billing**
2. See all your invoices with:
   - Invoice number
   - Amount
   - Due date
   - Status

### Invoice Status
| Status | Meaning |
|--------|---------|
| **Pending** | Invoice issued, awaiting payment |
| **Paid** | Payment received |
| **Overdue** | Past due date |

### Making a Payment
1. Go to **Billing**
2. Click on an invoice
3. Click **Record Payment**
4. Enter payment details:
   - Amount
   - Payment method
   - Reference number
5. Click **Submit**

### Payment Verification
- Payments are verified by the accounting team
- You'll see status updates in your billing history

---

# Course Admin Portal

## Overview
Course Admins manage all course scheduling, instructor assignments, and course completion.

## Dashboard
- **Calendar View**: All courses on a calendar
- **Pending Requests**: Courses needing scheduling
- **Today's Classes**: Classes happening today
- **Quick Stats**: Overview of course activity

## Course Calendar

### Viewing the Calendar
1. Go to **Dashboard** or **Calendar**
2. See all courses color-coded:
   - **Blue**: Scheduled/Pending
   - **Green**: Confirmed
   - **Yellow**: Completed
3. Click any course for details

### Show Completed Courses
- Check **Show Completed** to see past courses on the calendar

## Managing Course Requests

### Confirming a Course
1. Go to **Pending Requests**
2. Click on a request
3. Assign:
   - **Date and Time**
   - **Instructor**
   - **Location** (if different)
4. Click **Confirm Course**

### Reassigning an Instructor
1. Find the course
2. Click **Edit**
3. Select a new instructor
4. Save changes

## Completing Courses

### Marking a Course Complete
1. Go to the course details
2. Verify attendance has been taken
3. Click **Complete Course**

### Sending to Billing
After completion:
1. Click **Send to Billing**
2. Course is sent to accounting for invoicing

## Instructor Management
- View instructor availability
- See instructor workload
- Check instructor certifications

---

# HR Portal

## Overview
HR manages timesheets, instructor pay rates, and payroll processing.

## Dashboard
- **Pending Timesheets**: Timesheets awaiting approval
- **Approved This Month**: Count of approved timesheets
- **Total Hours**: Hours approved this month

## Timesheet Processing

### Reviewing Timesheets
1. Go to **Timesheet Processing**
2. See all submitted timesheets
3. Filter by:
   - Status (Pending, Approved, Rejected)
   - Instructor
   - Month

### Approving a Timesheet
1. Click on a timesheet to view details
2. Review:
   - Completed courses
   - Teaching hours
   - Travel and prep time
   - Total hours
3. Click **Approve** or **Reject**
4. Add comments if needed

### Late Submissions
- Late timesheets are marked with a **LATE** badge
- Review the reason and approve/reject accordingly

### Sending Reminders
1. Click **Send Reminders** button
2. See instructors who haven't submitted timesheets
3. Click **Send Reminders** to notify them

## Pay Rate Management

### Setting Pay Rates
1. Go to **Pay Rates**
2. Select an instructor
3. Set:
   - Hourly rate
   - Course bonus
   - Effective date
4. Save changes

## Payroll
- View payment requests generated from approved timesheets
- Track payment status
- Export payroll data

---

# Accounting Portal

## Overview
Accounting manages invoices, payments, and financial reporting.

## Dashboard
- **Pending Invoices**: Invoices awaiting action
- **Payments to Verify**: Payments needing verification
- **Financial Summary**: Overview of money in/out

## Invoice Management

### Creating Invoices
Invoices are auto-generated when courses are sent to billing:
1. Go to **Ready for Billing**
2. Select courses
3. Click **Create Invoice**
4. Review and confirm

### Invoice Approval
1. Go to **Pending Approval**
2. Review invoice details
3. Click **Approve** or **Reject**

### Posting Invoices
After approval:
1. Click **Post Invoice**
2. Invoice is sent to the organization

## Payment Verification

### Verifying Payments
1. Go to **Payment Verification**
2. See payments reported by organizations
3. For each payment:
   - Verify amount matches
   - Check payment method
   - Confirm receipt
4. Click **Verify** or **Reject**

## Financial Summary

### Viewing Reports
1. Go to **Financial Summary**
2. See:
   - Money In (payments received)
   - Money Out (instructor payments)
   - Outstanding invoices
3. Toggle between **Summary** and **Detailed** views

### Aging Report
View invoices by age:
- Current (0-30 days)
- 30-60 days
- 60-90 days
- Over 90 days

## Instructor Payments

### Processing Payments
1. Go to **Instructor Payments**
2. See approved timesheets ready for payment
3. Select payments to process
4. Choose payment method
5. Click **Process Payment**

---

# Vendor Portal

## Overview
The Vendor Portal allows external vendors (suppliers, contractors, service providers) to submit invoices, track payment status, and manage their company profile.

## Dashboard
When you log in, you'll see:
- **Pending Invoices**: Count of invoices awaiting processing
- **Total Invoices**: All invoices you've submitted
- **Total Paid**: Amount you've been paid
- **Avg. Payment Days**: Average time to receive payment

### Quick Actions
- Upload New Invoice
- View All Invoices
- Update Profile

## Invoice Workflow

Your invoices go through this process:

| Step | Status | Description |
|------|--------|-------------|
| 1 | **Pending Submission** | You've uploaded but not yet submitted |
| 2 | **Submitted to Admin** | Awaiting admin review |
| 3 | **Submitted to Accounting** | Admin approved, awaiting payment |
| 4 | **Paid** | Payment has been processed |

If rejected at any stage, the invoice returns to you for correction and resubmission.

## Uploading Invoices

### Upload a New Invoice
1. Go to **Upload Invoice**
2. Select your **Invoice PDF or HTML file** (max 5MB)
3. Optionally click **Scan Invoice** to auto-fill form fields using OCR
4. Fill in or verify the invoice details:
   - **Vendor Name**: Select your company from dropdown
   - **Date**: Invoice date
   - **Invoice #**: Your invoice number
   - **Acct. No.**: Account number (if applicable)
   - **Due Date**: Payment due date
   - **Item/Quantity/Rate**: Line item details
   - **Description**: Description of goods/services
   - **Subtotal, HST, Total**: Financial amounts
5. Click **Upload Invoice**

### Using OCR Scanning
The system can automatically read your invoice PDF:
1. Select your PDF file
2. Click **Scan Invoice**
3. Review the extracted data displayed in chips
4. If the data looks correct, click **OK**
5. If not, click **Clear Form** to enter manually
6. Verify vendor selection (may need manual selection)

## Invoice Management

### Viewing Your Invoices
1. Go to **Invoice History**
2. Use tabs to filter by status:
   - **Pending Submission**: Not yet submitted
   - **Submitted to Admin**: Awaiting approval
   - **Submitted to Accounting**: Awaiting payment
   - **Invoices Paid**: Completed payments
   - **All Invoices**: Complete history
   - **Pending Invoices**: All unpaid invoices

### Invoice Summary Statistics
The page displays totals for each status:
- Count of invoices in each stage
- Dollar amounts for each category

### Searching Invoices
- Use the search box to find by invoice #, company, item, or description
- Use the status filter dropdown
- Click **Clear Filters** to reset

### Invoice Details
Click the **View** icon on any invoice to see:
- Invoice information (number, company, dates)
- Payment summary (total, paid, balance)
- Description and line items
- Approval information
- Payment history (for paid invoices)

### Downloading Invoices
Click the **Download** icon to get a copy of the invoice PDF.

## Submitting to Admin

### Submit for Approval
After uploading an invoice:
1. The invoice is in **Pending Submission** status
2. Open the invoice details
3. Click **Submit to Admin**
4. Invoice moves to **Submitted to Admin** status

### If Rejected
If an invoice is rejected:
1. Review the rejection reason in invoice details
2. Make any necessary corrections
3. Use **Resend to Admin** with updated notes

## Invoice Status View

### Status Overview
1. Go to **Status** in navigation
2. See summary cards for each status
3. View counts of submitted, pending, approved, paid, rejected, and overdue invoices

### Status Meanings
| Status | Meaning |
|--------|---------|
| **Submitted** | Invoice sent, awaiting review |
| **Pending Review** | Under review by admin |
| **Approved** | Approved, awaiting payment |
| **Paid** | Payment completed |
| **Rejected** | Returned for correction |

## Paid Invoices

### Viewing Payment History
1. Go to **Paid Invoices**
2. See all completed payments with:
   - Invoice details
   - Payment date
   - Amount paid
   - Payment method

## Vendor Profile

### Updating Your Profile
1. Go to **Profile**
2. Edit your company information:
   - **Company Name**
   - **Vendor Type** (Supplier, Service Provider, Consultant, Contractor, Other)
   - **Contact Email**
   - **Contact Phone**
   - **Address**
3. Click **Save Profile**

---

# System Admin Portal

## Overview
System Admins manage users, organizations, system settings, and have access to all portals.

## User Management

### Creating Users
1. Go to **User Management**
2. Click **Add User**
3. Enter:
   - Username
   - Email
   - Role
   - Password
4. Click **Create**

### User Roles
| Role | Access |
|------|--------|
| **Instructor** | Instructor Portal |
| **Organization** | Organization Portal |
| **Course Admin** | Course Admin Portal |
| **HR** | HR Portal |
| **Accountant** | Accounting Portal |
| **Vendor** | Vendor Portal |
| **SysAdmin** | All Portals + Admin |

### Editing Users
1. Find the user
2. Click **Edit**
3. Update details
4. Save changes

### Deactivating Users
1. Find the user
2. Click **Deactivate**
3. User can no longer log in

## Organization Management

### Adding Organizations
1. Go to **Organizations**
2. Click **Add Organization**
3. Enter:
   - Name
   - Contact info
   - Billing info
4. Create

### Managing Organization Users
1. Select an organization
2. Click **Manage Users**
3. Add or remove users

## System Settings

### Course Types
- Add/edit course types
- Set pricing
- Configure durations

### Email Templates
- Customize notification emails
- Set up automated reminders

### System Configuration
- Application settings
- Integration settings
- Security settings

---

# Common Features

## Login
1. Go to the application URL
2. Enter your username and password
3. Click **Login**
4. You'll be directed to your portal based on your role

## Password Reset
1. Click **Forgot Password**
2. Enter your email
3. Check your email for reset link
4. Create new password

## Navigation
- Use the sidebar menu to navigate between sections
- Click the logo to return to dashboard
- Use the profile menu (top right) for account settings

## Notifications
- Bell icon shows unread notifications
- Click to see recent updates
- Mark as read or dismiss

## Logging Out
1. Click your profile (top right)
2. Click **Logout**

---

# Getting Help

## Support
If you need assistance:
1. Check this user guide
2. Contact your system administrator
3. Email support team

## Reporting Issues
When reporting an issue, include:
- What you were trying to do
- What happened instead
- Any error messages
- Screenshots if possible

---

**Last Updated**: January 27, 2026
**Version**: 2.1.0
