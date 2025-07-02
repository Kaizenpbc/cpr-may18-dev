# Organization Pricing System - Quick Reference

## 🚀 Quick Start

### **For System Administrators**

#### **Access the Interface**
1. Log in as sysadmin
2. Go to System Admin Portal
3. Click "Organization Pricing" in sidebar

#### **Add New Pricing**
1. Click "Add Pricing" button
2. Select Organization & Class Type
3. Enter Price per Student
4. Set Status (Active/Inactive)
5. Click "Create"

#### **Edit Pricing**
1. Find record in table
2. Click edit icon (pencil)
3. Modify price/status
4. Click "Update"

#### **Delete Pricing**
1. Find record in table
2. Click delete icon (trash)
3. Confirm deletion
4. Record soft-deleted

### **For Developers**

#### **API Endpoints**
```bash
# List all pricing (sysadmin)
GET /api/v1/organization-pricing/admin

# Create pricing (sysadmin)
POST /api/v1/organization-pricing/admin
{
  "organizationId": 1,
  "classTypeId": 1,
  "pricePerStudent": 99.99
}

# Update pricing (sysadmin)
PUT /api/v1/organization-pricing/admin/1
{
  "pricePerStudent": 150.00
}

# Delete pricing (sysadmin)
DELETE /api/v1/organization-pricing/admin/1

# Get organization pricing
GET /api/v1/organization-pricing/1

# Get specific course pricing
GET /api/v1/organization-pricing/course-pricing/1/1

# Calculate course cost
POST /api/v1/organization-pricing/calculate-cost
{
  "organizationId": 1,
  "classTypeId": 1,
  "studentCount": 15
}
```

#### **Database Schema**
```sql
CREATE TABLE organization_pricing (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    class_type_id INTEGER NOT NULL REFERENCES class_types(id),
    price_per_student DECIMAL(10,2) NOT NULL CHECK (price_per_student >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    last_modified_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP NULL,
    UNIQUE(organization_id, class_type_id, deleted_at)
);
```

#### **Frontend Components**
- `OrganizationPricingManager.tsx` - Main interface
- `OrganizationPricingDialog.tsx` - Add/Edit dialog
- API functions in `api.ts`

## 🔧 Common Operations

### **Test API Endpoints**
```bash
# Get sysadmin token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sysadmin","password":"password"}'

# Test all CRUD operations
curl -X GET http://localhost:3001/api/v1/organization-pricing/admin \
  -H "Authorization: Bearer <token>"
```

### **Database Queries**
```sql
-- View all active pricing
SELECT * FROM organization_pricing WHERE deleted_at IS NULL;

-- Check for duplicates
SELECT organization_id, class_type_id, COUNT(*) 
FROM organization_pricing 
WHERE deleted_at IS NULL 
GROUP BY organization_id, class_type_id 
HAVING COUNT(*) > 1;

-- Get pricing with organization/class type names
SELECT op.*, o.name as organization_name, ct.name as class_type_name
FROM organization_pricing op
JOIN organizations o ON op.organization_id = o.id
JOIN class_types ct ON op.class_type_id = ct.id
WHERE op.deleted_at IS NULL;
```

## 🚨 Troubleshooting

### **Common Issues**

| Issue | Solution |
|-------|----------|
| "Organization pricing not found" | Check if record exists and is active |
| "Duplicate pricing record" | Only one active record per org/class type |
| "Invalid price" | Price must be positive number |
| Frontend not loading | Check browser console and API endpoints |

### **Debug Commands**
```bash
# Check if backend is running
curl http://localhost:3001/api/v1/health

# Check if frontend is running
curl http://localhost:5173

# Test authentication
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

## 📋 Checklist

### **Implementation Complete**
- ✅ Database migration created and run
- ✅ Backend service layer implemented
- ✅ API routes configured
- ✅ Frontend components created
- ✅ System admin portal integration
- ✅ API testing completed
- ✅ Documentation updated

### **Ready for Production**
- ✅ Role-based access control
- ✅ Input validation and sanitization
- ✅ Error handling and logging
- ✅ Audit trail implementation
- ✅ Soft delete support
- ✅ Performance optimization

## 📚 Documentation Links

- **[Full Documentation](./ORGANIZATION_PRICING_DOCUMENTATION.md)** - Comprehensive guide
- **[API Reference](./ORGANIZATION_PRICING_DOCUMENTATION.md#api-reference)** - All endpoints
- **[User Guide](./ORGANIZATION_PRICING_DOCUMENTATION.md#user-guide)** - Step-by-step instructions
- **[Troubleshooting](./ORGANIZATION_PRICING_DOCUMENTATION.md#troubleshooting)** - Common issues and solutions

---

**Last Updated**: July 2, 2025  
**Version**: 1.0.0  
**Status**: Production Ready 