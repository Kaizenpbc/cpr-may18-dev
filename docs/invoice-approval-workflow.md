# Software Design Specification: Invoice Approval Workflow

| Document Info | |
|---------------|---|
| **Version** | 1.0 |
| **Status** | Implemented |
| **Date Created** | January 2026 |
| **Last Updated** | January 2026 |
| **Author** | Development Team |
| **Commit** | 8870caf |

---

## 1. Introduction

### 1.1 Purpose
This document describes the design and implementation of an invoice approval workflow for the CPR Training Management System. The feature adds a review step between invoice creation and posting to organization portals.

### 1.2 Scope
This feature affects:
- Invoice creation process
- Accountant portal functionality
- Organization portal invoice visibility
- Database schema

### 1.3 Definitions & Acronyms
| Term | Definition |
|------|------------|
| Invoice | Bill generated for completed training courses |
| Approval Status | State of invoice review (pending/approved/rejected) |
| Posted to Org | Flag indicating invoice is visible to organization |
| AR | Accounts Receivable |
| BP | Bills Payable |

---

## 2. Problem Statement

### 2.1 Current State (Before)
When an accountant creates an invoice from the billing queue:
1. Invoice is immediately posted to the organization (`posted_to_org = TRUE`)
2. Invoice appears instantly in Organization's Bills Payable
3. Invoice appears in Accountant's Organization Receivables

### 2.2 Issues
- No opportunity to review invoice before organization sees it
- Errors in invoices are visible to customers immediately
- No formal approval process for billing

### 2.3 Desired State (After)
- Invoices require explicit approval before posting to organization
- Accountant can review and approve/reject invoices
- Rejected invoices are not visible to organizations
- Clear audit trail of invoice states

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | System shall create invoices in "pending" approval status | High |
| FR-02 | System shall NOT post invoices to organization until approved | High |
| FR-03 | Accountant shall be able to view all pending invoices | High |
| FR-04 | Accountant shall be able to approve pending invoices | High |
| FR-05 | Accountant shall be able to reject pending invoices | High |
| FR-06 | Approved invoices shall be automatically posted to organization | High |
| FR-07 | Organization Receivables shall only show approved invoices | High |
| FR-08 | Existing invoices shall be migrated based on current posted status | Medium |

### 3.2 Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-01 | Approval action shall complete within 2 seconds | Medium |
| NFR-02 | Pending approvals list shall load within 3 seconds | Medium |
| NFR-03 | Feature shall work on all supported browsers | High |
| NFR-04 | Database migration shall not cause downtime | High |

### 3.3 Out of Scope
- Multi-level approval (manager sign-off)
- Approval thresholds based on amount
- Email notifications for pending approvals
- Edit/resubmit rejected invoices
- Approval notes/comments

---

## 4. User Stories

### 4.1 Accountant Creates Invoice
**As an** accountant
**I want** invoices to be created in pending status
**So that** I can review them before the organization sees them

**Acceptance Criteria:**
- Invoice created with `approval_status = 'pending'`
- Invoice created with `posted_to_org = FALSE`
- Invoice appears in Pending Approvals queue
- Invoice does NOT appear in Organization's Bills Payable

### 4.2 Accountant Reviews Pending Invoices
**As an** accountant
**I want** to see a list of invoices awaiting approval
**So that** I can review and process them

**Acceptance Criteria:**
- Dedicated "Pending Approvals" view accessible from menu
- List shows: Invoice#, Organization, Course, Date, Amount
- List ordered by oldest first
- Empty state shown when no pending invoices

### 4.3 Accountant Approves Invoice
**As an** accountant
**I want** to approve an invoice
**So that** it becomes visible to the organization

**Acceptance Criteria:**
- Click "Approve" button on pending invoice
- Invoice status changes to "approved"
- Invoice is posted to organization
- Invoice appears in Organization's Bills Payable
- Invoice appears in Accountant's Organization Receivables
- Success message displayed

### 4.4 Accountant Rejects Invoice
**As an** accountant
**I want** to reject an invoice
**So that** incorrect invoices are not sent to organizations

**Acceptance Criteria:**
- Click "Reject" button on pending invoice
- Invoice status changes to "rejected"
- Invoice is NOT posted to organization
- Invoice removed from Pending Approvals queue
- Success message displayed

---

## 5. System Design

### 5.1 Workflow Diagram

```
┌─────────────────┐
│ Course Completed│
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Billing Queue  │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────┐
│ Accountant Creates Invoice          │
│ - approval_status = 'pending'       │
│ - posted_to_org = FALSE             │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────┐
│Pending Approvals│
│     Queue       │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Review  │
    └────┬────┘
         │
    ┌────┴────┐
    v         v
┌───────┐ ┌────────┐
│Approve│ │ Reject │
└───┬───┘ └───┬────┘
    │         │
    v         v
┌─────────┐ ┌──────────────┐
│Posted to│ │Not Posted    │
│Org=TRUE │ │Status=rejected│
└────┬────┘ └──────────────┘
     │
     v
┌──────────────────────────┐
│ Visible in:              │
│ - Org Bills Payable      │
│ - Accountant Receivables │
└──────────────────────────┘
```

### 5.2 State Diagram

```
                    ┌─────────┐
      Create        │         │
    ─────────────>  │ PENDING │
                    │         │
                    └────┬────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           v                           v
    ┌──────────┐                ┌──────────┐
    │ APPROVED │                │ REJECTED │
    │          │                │          │
    │posted=T  │                │posted=F  │
    └──────────┘                └──────────┘
```

---

## 6. Data Model

### 6.1 Schema Changes

**Table: `invoices`**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| approval_status | VARCHAR(20) | 'pending' | pending, approved, rejected |

### 6.2 Migration Strategy

```sql
-- Add column if not exists
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

-- Migrate existing data
UPDATE invoices
SET approval_status = 'approved'
WHERE posted_to_org = TRUE;

UPDATE invoices
SET approval_status = 'pending'
WHERE posted_to_org = FALSE;
```

### 6.3 Data Integrity
- `approval_status` and `posted_to_org` must be consistent:
  - `approved` → `posted_to_org = TRUE`
  - `pending` or `rejected` → `posted_to_org = FALSE`

---

## 7. API Design

### 7.1 Get Pending Approvals

**Endpoint:** `GET /api/v1/accounting/invoices/pending-approval`

**Authentication:** Required (Accountant role)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "invoice_number": "INV-2026-123456",
      "organization_id": 5,
      "organization_name": "ABC Company",
      "course_type_name": "First Aid",
      "invoice_date": "2026-01-25",
      "base_cost": 500.00,
      "tax_amount": 65.00,
      "studentsattendance": 10,
      "rate_per_student": 50.00,
      "approval_status": "pending",
      "created_at": "2026-01-25T10:30:00Z"
    }
  ]
}
```

### 7.2 Approve/Reject Invoice

**Endpoint:** `PUT /api/v1/accounting/invoices/:id/approval`

**Authentication:** Required (Accountant role)

**Request:**
```json
{
  "approval_status": "approved"  // or "rejected"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Invoice approved and posted to organization.",
  "data": {
    "id": 123,
    "approval_status": "approved",
    "posted_to_org": true,
    "posted_to_org_at": "2026-01-25T14:30:00Z"
  }
}
```

**Response (Error - Already Processed):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invoice is already approved"
  }
}
```

---

## 8. UI Design

### 8.1 Pending Approvals View

**Location:** Accounting Portal > Billing & Receivables > Pending Approvals

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│ Pending Invoice Approvals                                      │
│ Review and approve invoices before they are posted to orgs     │
├────────────────────────────────────────────────────────────────┤
│ Invoice#  │ Organization │ Course    │ Date    │ Amount │ Actions
├───────────┼──────────────┼───────────┼─────────┼────────┼─────────
│ INV-2026- │ ABC Company  │ First Aid │ Jan 25  │ $565   │ [Approve] [Reject]
│ 123456    │              │           │         │        │
├───────────┼──────────────┼───────────┼─────────┼────────┼─────────
│ INV-2026- │ XYZ Corp     │ CPR Basic │ Jan 24  │ $282.50│ [Approve] [Reject]
│ 123457    │              │           │         │        │
└───────────┴──────────────┴───────────┴─────────┴────────┴─────────
```

**Empty State:**
```
┌────────────────────────────────────────────────────────────────┐
│                 No invoices pending approval                   │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 Menu Structure

```
Billing & Receivables
  ├── Ready for Billing
  ├── Pending Approvals    <-- NEW
  ├── Organization Receivables
  └── Invoice History
```

---

## 9. Error Handling

| Scenario | Error Code | Message | HTTP Status |
|----------|------------|---------|-------------|
| Invoice not found | RESOURCE_NOT_FOUND | Invoice not found | 404 |
| Already approved | VALIDATION_ERROR | Invoice is already approved | 400 |
| Already rejected | VALIDATION_ERROR | Invoice is already rejected | 400 |
| Invalid status value | VALIDATION_ERROR | Invalid approval status | 400 |
| Unauthorized | AUTH_INSUFFICIENT_PERMISSIONS | Access denied | 403 |

---

## 10. Security Considerations

### 10.1 Authorization
- Only users with `accountant` role can access pending approvals
- Only users with `accountant` role can approve/reject invoices
- Organizations cannot see invoices until `posted_to_org = TRUE`

### 10.2 Data Protection
- Approval actions logged with timestamp
- Invoice state changes are atomic (transaction-wrapped)

---

## 11. Testing Plan

### 11.1 Unit Tests

| Test Case | Expected Result |
|-----------|-----------------|
| Create invoice | approval_status = 'pending', posted_to_org = FALSE |
| Approve pending invoice | approval_status = 'approved', posted_to_org = TRUE |
| Reject pending invoice | approval_status = 'rejected', posted_to_org = FALSE |
| Approve already approved | Error: already approved |
| Reject already rejected | Error: already rejected |

### 11.2 Integration Tests

| Test Case | Expected Result |
|-----------|-----------------|
| Create invoice, check pending queue | Invoice appears in queue |
| Approve invoice, check org portal | Invoice visible to org |
| Reject invoice, check org portal | Invoice NOT visible to org |
| Check AR view | Only approved invoices shown |

### 11.3 Manual Verification Checklist

- [ ] Create invoice from billing queue
- [ ] Verify invoice appears in Pending Approvals
- [ ] Verify invoice NOT in Org Bills Payable
- [ ] Approve invoice
- [ ] Verify invoice in Org Bills Payable
- [ ] Verify invoice in Accountant Receivables
- [ ] Create another invoice, reject it
- [ ] Verify rejected invoice NOT in Org Bills Payable
- [ ] Verify existing invoices migrated correctly

---

## 12. Implementation Details

### 12.1 Files Modified

| File | Changes |
|------|---------|
| `backend/src/scripts/init-db.ts` | Added approval_status column, migration logic |
| `backend/src/routes/v1/index.ts` | Modified invoice creation, added endpoints |
| `frontend/src/components/portals/AccountingPortal.tsx` | Added PendingApprovalsView, menu item, updated AR filter |
| `frontend/src/services/api.ts` | Added API functions |

### 12.2 Database Migration

Migration is handled automatically on application startup via `init-db.ts`:
1. Column added if not exists
2. Existing data migrated based on `posted_to_org` value
3. No manual migration steps required
4. No downtime expected

---

## 13. Rollback Plan

If rollback is required:

1. **Database:** Column can remain (no harm if unused)
2. **Backend:** Revert to previous commit, redeploy
3. **Frontend:** Revert to previous commit, redeploy
4. **Data:** Run SQL to set all pending invoices to approved and post to org:
   ```sql
   UPDATE invoices
   SET approval_status = 'approved',
       posted_to_org = TRUE,
       posted_to_org_at = CURRENT_TIMESTAMP
   WHERE approval_status = 'pending';
   ```

---

## 14. Future Enhancements

These items are out of scope for initial release but may be considered:

1. **Approval Notes** - Add comments when approving/rejecting
2. **Audit Log** - Track who approved/rejected and when
3. **Email Notifications** - Alert accountants of pending invoices
4. **Approval Thresholds** - Auto-approve invoices below certain amount
5. **Edit & Resubmit** - Allow editing rejected invoices
6. **Bulk Actions** - Approve/reject multiple invoices at once
7. **Dashboard Widget** - Show pending count on main dashboard

---

## 15. Appendix

### 15.1 Related Documents
- `docs/INVOICE_SYSTEM_IMPROVEMENTS.md`
- `docs/INVOICE_SYSTEM_USER_GUIDE.md`
- `docs/API_DOCUMENTATION.md`

### 15.2 Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Dev Team | Initial implementation |
