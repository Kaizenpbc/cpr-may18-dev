# Invoice Approval Workflow

**Status:** Implemented
**Date:** January 2026
**Commit:** 8870caf

---

## Overview

Added an approval step between invoice creation and posting to organization. Previously invoices were auto-posted immediately when created from the billing queue. Now invoices require explicit approval before they become visible to the organization.

## Workflow

```
Course Completed → Billing Queue → Create Invoice (pending, NOT posted)
    → "Pending Approvals" queue → Accountant Reviews
    → Approve → Invoice posted to Org → Appears in Bills Payable & Receivables
    → Reject → Invoice marked as rejected (not posted)
```

---

## Implementation Details

### Phase 1: Database Changes - COMPLETE

**File: `backend/src/scripts/init-db.ts`**

1. Added `approval_status` column to invoices table:
   ```sql
   approval_status VARCHAR(20) DEFAULT 'pending'
   ```
   Valid values: `pending`, `approved`, `rejected`

2. Added migration for existing tables:
   - Column is added if it doesn't exist
   - Existing invoices with `posted_to_org = TRUE` are set to `approval_status = 'approved'`
   - Existing invoices with `posted_to_org = FALSE` are set to `approval_status = 'pending'`

---

### Phase 2: Backend API Changes - COMPLETE

**File: `backend/src/routes/v1/index.ts`**

#### 2.1 Invoice Creation (POST /accounting/invoices)
- Changed `posted_to_org = FALSE` (was TRUE)
- Added `approval_status = 'pending'`
- Set `posted_to_org_at = NULL` (was CURRENT_TIMESTAMP)

#### 2.2 New Endpoint: GET /accounting/invoices/pending-approval
- Returns invoices where `approval_status = 'pending'`
- Includes: invoice details, org name, course details, amounts, balance
- Ordered by created_at ASC (oldest first)

#### 2.3 New Endpoint: PUT /accounting/invoices/:id/approval
- Accepts `approval_status` in body (`approved` or `rejected`)
- When approved:
  - Sets `approval_status = 'approved'`
  - Sets `posted_to_org = TRUE`
  - Sets `posted_to_org_at = CURRENT_TIMESTAMP`
- When rejected:
  - Sets `approval_status = 'rejected'`
  - `posted_to_org` remains FALSE

#### 2.4 Invoice List Queries
- Changed `NULL as approval_status` to `i.approval_status` in accounting invoice queries

---

### Phase 3: Frontend Changes - COMPLETE

**File: `frontend/src/components/portals/AccountingPortal.tsx`**

#### 3.1 PendingApprovalsView Component
- Fetches from `/accounting/invoices/pending-approval`
- Displays table with: Invoice#, Organization, Course, Date, Amount
- Actions: Approve (green button), Reject (red outlined button)
- Shows "No invoices pending approval" when empty

#### 3.2 Menu Item Added
Added to "Billing & Receivables" group:
```javascript
{
  label: 'Pending Approvals',
  icon: <HourglassEmptyIcon />,
  path: 'pending-approvals',
  component: <PendingApprovalsView />
}
```

#### 3.3 AccountsReceivableView Filter Updated
- Now only shows invoices where `approval_status === 'approved'`
- Pending and rejected invoices are excluded from this view

**File: `frontend/src/services/api.ts`**

#### 3.4 API Functions Added
- `getPendingApprovals()` - Fetch pending invoices
- `approveInvoice(invoiceId)` - Approve an invoice
- `rejectInvoice(invoiceId)` - Reject an invoice

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/src/scripts/init-db.ts` | Added approval_status column + migration |
| `backend/src/routes/v1/index.ts` | Modified invoice creation, added pending-approval endpoint, added approval endpoint, updated queries |
| `frontend/src/components/portals/AccountingPortal.tsx` | Added PendingApprovalsView component + menu item, updated AR filter |
| `frontend/src/services/api.ts` | Added getPendingApprovals, approveInvoice, rejectInvoice functions |

---

## Verification Checklist

- [x] Create invoice from billing queue
- [x] Verify `approval_status = 'pending'`, `posted_to_org = FALSE`
- [x] Check "Pending Approvals" view shows the new invoice
- [x] Approve invoice
- [x] Verify `approval_status = 'approved'`, `posted_to_org = TRUE`
- [ ] Check invoice appears in Org Bills Payable
- [ ] Check invoice appears in Accountant Receivables
- [ ] Verify existing posted invoices migrated to `approval_status = 'approved'`

---

## Design Notes

**Why approval_status instead of just posted_to_org?**

The `approval_status` column provides explicit states (pending/approved/rejected) while `posted_to_org` is a boolean. This allows for:
- Tracking rejected invoices separately from pending ones
- Potential future states (e.g., 'needs_revision')
- Clearer audit trail

**Alternative considered:** Using only `posted_to_org = FALSE` for pending and the existing "Post to Organization" button as approval. This would have been simpler but lacks the reject capability and dedicated approval queue.

---

## Future Enhancements (Not Implemented)

- Approval notes/comments
- Audit log (who approved/rejected and when)
- Email notifications for pending approvals
- Approval thresholds (auto-approve below certain amount)
- Edit and resubmit rejected invoices
