# Organization Pricing System Documentation

## Overview

The Organization Pricing System allows system administrators to set and manage different pricing for CPR training courses on a per-organization basis. This replaces the previous uniform pricing model with a flexible, client-specific pricing structure.

## Features

### ✅ **Implemented Features**

#### **1. Organization-Specific Pricing**
- Set different prices per organization per course type
- Override default pricing for specific clients
- Maintain pricing history with audit trail

#### **2. System Admin Interface**
- Full CRUD operations for pricing management
- Filter and sort pricing records
- Bulk operations and data export capabilities
- Real-time validation and error handling

#### **3. Backend API**
- RESTful endpoints for pricing management
- Role-based access control (sysadmin only)
- Comprehensive validation and error handling
- Database transaction support

#### **4. Database Schema**
- `organization_pricing` table with proper relationships
- Indexes for performance optimization
- Soft delete support for audit trail
- Automatic timestamp management

## Technical Implementation

### **Database Schema**

```sql
CREATE TABLE organization_pricing (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    class_type_id INTEGER NOT NULL REFERENCES class_types(id) ON DELETE CASCADE,
    price_per_student DECIMAL(10,2) NOT NULL CHECK (price_per_student >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    last_modified_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP NULL,
    
    -- Ensure unique pricing per organization per class type
    UNIQUE(organization_id, class_type_id, deleted_at)
);
```

### **Backend Components**

#### **1. Service Layer** (`organizationPricingService.ts`)
```typescript
export class OrganizationPricingService {
  // Get pricing for specific organization and class type
  async getOrganizationPricing(organizationId: number, classTypeId: number)
  
  // Get all pricing for an organization
  async getOrganizationPricingList(organizationId: number)
  
  // Get all organization pricing (admin view)
  async getAllOrganizationPricing(filters?: { organizationId?: number, classTypeId?: number })
  
  // Create new organization pricing
  async createOrganizationPricing(data: CreateOrganizationPricingData)
  
  // Update organization pricing
  async updateOrganizationPricing(id: number, data: UpdateOrganizationPricingData)
  
  // Soft delete organization pricing
  async deleteOrganizationPricing(id: number)
  
  // Calculate course cost with fallback logic
  async calculateCourseCost(organizationId: number, classTypeId: number, studentCount: number)
}
```

#### **2. API Routes** (`organizationPricing.ts`)
- `GET /api/v1/organization-pricing/admin` - List all pricing records
- `POST /api/v1/organization-pricing/admin` - Create new pricing record
- `PUT /api/v1/organization-pricing/admin/:id` - Update pricing record
- `DELETE /api/v1/organization-pricing/admin/:id` - Delete pricing record
- `GET /api/v1/organization-pricing/:organizationId` - Get organization's pricing
- `GET /api/v1/organization-pricing/course-pricing/:organizationId/:classTypeId` - Get specific pricing

### **Frontend Components**

#### **1. OrganizationPricingManager.tsx**
- Main interface for sysadmin users
- Table with sorting, filtering, and pagination
- Add/Edit/Delete operations
- Real-time data refresh

#### **2. OrganizationPricingDialog.tsx**
- Modal dialog for creating/editing pricing records
- Form validation and error handling
- Organization and class type selection

#### **3. API Integration** (`api.ts`)
```typescript
// Organization Pricing API endpoints
export const getOrganizationPricing = async () => {
  const response = await api.get('/organization-pricing/admin');
  return response.data;
};

export const createOrganizationPricing = async (data: any) => {
  const response = await api.post('/organization-pricing/admin', data);
  return response.data;
};

export const updateOrganizationPricing = async (id: number, data: any) => {
  const response = await api.put(`/organization-pricing/admin/${id}`, data);
  return response.data;
};

export const deleteOrganizationPricing = async (id: number) => {
  const response = await api.delete(`/organization-pricing/admin/${id}`);
  return response.data;
};
```

## User Guide

### **For System Administrators**

#### **Accessing the Pricing Management Interface**
1. Log in as a system administrator
2. Navigate to the System Admin Portal
3. Click on "Organization Pricing" in the left sidebar
4. You'll see the pricing management interface

#### **Adding New Pricing Records**
1. Click the "Add Pricing" button
2. Select the organization from the dropdown
3. Select the class type from the dropdown
4. Enter the price per student (must be positive)
5. Set the status (Active/Inactive)
6. Click "Create" to save

#### **Editing Existing Pricing**
1. Find the pricing record in the table
2. Click the edit icon (pencil) in the Actions column
3. Modify the price or status as needed
4. Click "Update" to save changes

#### **Deleting Pricing Records**
1. Find the pricing record in the table
2. Click the delete icon (trash) in the Actions column
3. Confirm the deletion in the dialog
4. The record will be soft-deleted (marked as inactive)

#### **Filtering and Sorting**
- **Filter by Organization**: Use the "Filter by Organization" dropdown
- **Filter by Class Type**: Use the "Filter by Class Type" dropdown
- **Sort by Column**: Click column headers to sort ascending/descending
- **Refresh Data**: Click the "Refresh" button to reload data

### **For Organization Users**

#### **Viewing Your Organization's Pricing**
1. Log in to your organization portal
2. Navigate to the pricing section (if available)
3. View the current pricing for your organization's courses

#### **Understanding Pricing Structure**
- Each course type may have different pricing
- Pricing is set per student
- Inactive pricing records are not used for billing
- Contact your system administrator for pricing changes

## API Reference

### **Authentication**
All organization pricing endpoints require sysadmin role authentication.

### **Endpoints**

#### **List All Pricing Records (Admin)**
```http
GET /api/v1/organization-pricing/admin
Authorization: Bearer <sysadmin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "organizationId": 1,
      "classTypeId": 1,
      "pricePerStudent": "99.99",
      "isActive": true,
      "createdAt": "2025-07-02T23:25:09.946Z",
      "updatedAt": "2025-07-02T23:25:09.946Z",
      "createdBy": 5,
      "lastModifiedBy": null,
      "deletedAt": null,
      "organizationName": "ABC Company",
      "classTypeName": "CPR Basic"
    }
  ],
  "message": "All organization pricing retrieved successfully"
}
```

#### **Create Pricing Record (Admin)**
```http
POST /api/v1/organization-pricing/admin
Authorization: Bearer <sysadmin_token>
Content-Type: application/json

{
  "organizationId": 1,
  "classTypeId": 1,
  "pricePerStudent": 99.99
}
```

#### **Update Pricing Record (Admin)**
```http
PUT /api/v1/organization-pricing/admin/1
Authorization: Bearer <sysadmin_token>
Content-Type: application/json

{
  "pricePerStudent": 150.00,
  "isActive": true
}
```

#### **Delete Pricing Record (Admin)**
```http
DELETE /api/v1/organization-pricing/admin/1
Authorization: Bearer <sysadmin_token>
```

#### **Get Organization's Pricing**
```http
GET /api/v1/organization-pricing/1
Authorization: Bearer <organization_token>
```

#### **Get Course Pricing**
```http
GET /api/v1/organization-pricing/course-pricing/1/1
Authorization: Bearer <organization_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organizationId": 1,
    "classTypeId": 1,
    "pricePerStudent": 99.99,
    "isActive": true,
    "source": "organization_specific"
  },
  "message": "Course pricing retrieved successfully"
}
```

#### **Calculate Course Cost**
```http
POST /api/v1/organization-pricing/calculate-cost
Authorization: Bearer <organization_token>
Content-Type: application/json

{
  "organizationId": 1,
  "classTypeId": 1,
  "studentCount": 15
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCost": 1499.85,
    "pricePerStudent": 99.99,
    "studentCount": 15,
    "pricingSource": "organization_specific"
  },
  "message": "Course cost calculated successfully"
}
```

## Database Migration

### **Migration File: `20250702_create_organization_pricing.sql`**

The migration creates the organization pricing table with:
- Primary key and foreign key constraints
- Check constraints for positive pricing
- Unique constraint for organization/class type combinations
- Indexes for performance optimization
- Triggers for automatic timestamp updates

### **Rollback Strategy**
```sql
-- To rollback the migration:
DROP TABLE IF EXISTS organization_pricing CASCADE;
DROP INDEX IF EXISTS idx_organization_pricing_org_id;
DROP INDEX IF EXISTS idx_organization_pricing_class_type_id;
DROP INDEX IF EXISTS idx_organization_pricing_active;
DROP INDEX IF EXISTS idx_organization_pricing_composite;
DROP TRIGGER IF EXISTS trigger_organization_pricing_updated_at ON organization_pricing;
DROP FUNCTION IF EXISTS update_organization_pricing_updated_at();
```

## Testing

### **Backend API Testing**
All CRUD operations have been tested with curl commands:

```bash
# Test CREATE
curl -X POST http://localhost:3001/api/v1/organization-pricing/admin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"organizationId":1,"classTypeId":1,"pricePerStudent":123.45}'

# Test READ
curl -X GET http://localhost:3001/api/v1/organization-pricing/admin \
  -H "Authorization: Bearer <token>"

# Test UPDATE
curl -X PUT http://localhost:3001/api/v1/organization-pricing/admin/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pricePerStudent":150.00}'

# Test DELETE
curl -X DELETE http://localhost:3001/api/v1/organization-pricing/admin/1 \
  -H "Authorization: Bearer <token>"
```

### **Frontend Testing**
- Component rendering and interaction testing
- Form validation testing
- API integration testing
- Error handling testing

## Security Considerations

### **Access Control**
- Only sysadmin users can manage organization pricing
- Organization users can only view their own pricing
- All endpoints require valid JWT authentication

### **Data Validation**
- Server-side validation for all input data
- SQL injection prevention through parameterized queries
- XSS protection through input sanitization

### **Audit Trail**
- All pricing changes are logged with user information
- Soft delete maintains historical data
- Timestamps track creation and modification dates

## Performance Considerations

### **Database Optimization**
- Indexes on frequently queried columns
- Composite index for organization/class type lookups
- Soft delete maintains referential integrity

### **Caching Strategy**
- Consider implementing Redis caching for frequently accessed pricing data
- Cache invalidation on pricing updates

## Troubleshooting

### **Common Issues**

#### **1. "Organization pricing not found" Error**
- Verify the organization and class type combination exists
- Check if the pricing record is active
- Ensure proper permissions for the user

#### **2. "Duplicate pricing record" Error**
- Each organization can only have one active pricing record per class type
- Check for existing records before creating new ones
- Use update instead of create for existing combinations

#### **3. "Invalid price" Error**
- Price must be a positive number
- Price cannot exceed 999999.99 (database constraint)
- Ensure proper decimal formatting

#### **4. Frontend Loading Issues**
- Check browser console for JavaScript errors
- Verify API endpoints are accessible
- Ensure proper authentication token

### **Debug Commands**

#### **Check Database Records**
```sql
-- View all organization pricing records
SELECT * FROM organization_pricing WHERE deleted_at IS NULL;

-- Check for duplicate records
SELECT organization_id, class_type_id, COUNT(*) 
FROM organization_pricing 
WHERE deleted_at IS NULL 
GROUP BY organization_id, class_type_id 
HAVING COUNT(*) > 1;
```

#### **Check API Endpoints**
```bash
# Test endpoint accessibility
curl -X GET http://localhost:3001/api/v1/organization-pricing/admin \
  -H "Authorization: Bearer <token>"

# Check response format
curl -X GET http://localhost:3001/api/v1/organization-pricing/admin \
  -H "Authorization: Bearer <token>" | jq .
```

## Future Enhancements

### **Planned Features**
1. **Bulk Pricing Import/Export**
   - CSV import for multiple pricing records
   - Excel export for reporting

2. **Pricing History Tracking**
   - Version history for pricing changes
   - Approval workflow for pricing updates

3. **Advanced Pricing Models**
   - Volume discounts based on student count
   - Seasonal pricing adjustments
   - Contract-based pricing tiers

4. **Integration Features**
   - QuickBooks pricing synchronization
   - Automated pricing updates based on market rates

### **Performance Improvements**
1. **Caching Implementation**
   - Redis caching for pricing lookups
   - Cache invalidation strategies

2. **Database Optimization**
   - Partitioning for large datasets
   - Query optimization for complex reports

## Support and Maintenance

### **Monitoring**
- Monitor API response times
- Track pricing change frequency
- Alert on pricing anomalies

### **Backup Strategy**
- Regular database backups including pricing data
- Point-in-time recovery capabilities
- Data retention policies

### **Documentation Updates**
- Keep this documentation current with system changes
- Update user guides for new features
- Maintain API documentation

---

**Last Updated**: July 2, 2025  
**Version**: 1.0.0  
**Status**: Production Ready 