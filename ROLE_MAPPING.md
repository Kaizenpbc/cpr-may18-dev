# Role-Based Access Control (RBAC) Mapping

## User Roles and Their Permissions

### 🔐 **Role Hierarchy**
1. **superadmin** - Full system access
2. **sysadmin** - System administration
3. **admin** - General administration
4. **courseadmin** - Course-specific administration
5. **accountant** - Financial operations
6. **instructor** - Course instruction
7. **vendor** - Vendor operations
8. **organization** - Organization management
9. **hr** - Human resources
10. **student** - Student access

## 📋 **Endpoint Access Matrix**

### **Admin Endpoints** (`/admin/*`)
- **Allowed Roles**: `admin`, `sysadmin`, `courseadmin`
- **Examples**:
  - `/admin/courses` - Course management
  - `/admin/vendor-invoices` - Vendor invoice approval
  - `/admin/courses/:courseId/students` - Student management

### **Accounting Endpoints** (`/accounting/*`)
- **Allowed Roles**: `accountant`, `admin`
- **Examples**:
  - `/accounting/vendor-invoices` - Vendor invoice processing
  - `/accounting/course-pricing` - Pricing management

### **Vendor Endpoints** (`/vendor/*`)
- **Allowed Roles**: `vendor`
- **Examples**:
  - `/vendor/invoices` - Invoice management
  - `/vendor/dashboard` - Vendor dashboard

### **Instructor Endpoints** (`/instructor/*`)
- **Allowed Roles**: `instructor`
- **Examples**:
  - `/instructor/classes` - Class management
  - `/instructor/attendance` - Attendance tracking

### **Organization Endpoints** (`/organization/*`)
- **Allowed Roles**: `organization`
- **Examples**:
  - `/organization/courses` - Course requests
  - `/organization/pricing` - Pricing access

### **HR Endpoints** (`/hr/*`)
- **Allowed Roles**: `hr`, `sysadmin`
- **Examples**:
  - `/hr/timesheets` - Timesheet management
  - `/hr/payroll` - Payroll operations

## 🚨 **Common Issues & Solutions**

### **Issue 1: CourseAdminPortal Access Denied**
- **Problem**: `courseadmin` users can't access admin endpoints
- **Solution**: Add `courseadmin` to admin endpoint role checks

### **Issue 2: Missing API Methods**
- **Problem**: Frontend calls non-existent API methods
- **Solution**: Add missing methods to appropriate API objects

### **Issue 3: Role Mismatch**
- **Problem**: Backend expects different role than frontend provides
- **Solution**: Align role expectations between frontend and backend

## 🔧 **Best Practices**

1. **Always test with all user roles** when adding new endpoints
2. **Use role constants** instead of hardcoded strings
3. **Document role requirements** for each endpoint
4. **Test role-based access** in development before deployment
5. **Maintain role hierarchy** - higher roles should have access to lower role endpoints

## 📝 **Testing Checklist**

Before deploying any changes:
- [ ] Test with `admin` role
- [ ] Test with `courseadmin` role  
- [ ] Test with `accountant` role
- [ ] Test with `instructor` role
- [ ] Test with `vendor` role
- [ ] Test with `organization` role
- [ ] Verify unauthorized access is properly blocked
- [ ] Check frontend API methods exist
- [ ] Verify error messages are user-friendly 