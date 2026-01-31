# Organization Locations User Guide

## Overview

Organization Locations allow you to manage multiple physical locations (branches, offices, sites) within a single organization. Each location can have its own contact information, and users/courses can be assigned to specific locations.

## Who Can Manage Locations?

| Role | View Locations | Add/Edit/Delete |
|------|---------------|-----------------|
| **sysadmin** | Yes | Yes |
| **admin** | Yes | Yes |
| **accountant** | Yes | No |
| **organization** | No | No |

**Note**: Organization portal users cannot manage locations. This is an administrative function only.

## How to Access Location Management

### SystemAdmin Portal (Recommended)

1. Log in as a **sysadmin** user
2. Navigate to **Organizations** in the sidebar
3. Find the organization in the table
4. Click the **Location pin icon** (purple) in the Actions column

**Important**: The Location icon is separate from the Edit icon:
```
Actions column:  [Location Pin] [Edit Pencil] [Delete Trash]
                      ^
                Click this for locations
```

### SuperAdmin Portal

1. Log in as an **admin** user
2. Navigate to **Manage Organizations**
3. Click **Edit** on an existing organization
4. Scroll down to see the **Locations** section
5. Use "Add Location" to create new locations

**Note**: The Locations section only appears when editing an existing organization, not when creating a new one.

## Managing Locations

### Adding a New Location

**From SystemAdmin Portal:**
1. Click the Location pin icon for the organization
2. Click **Add Location** button
3. Fill in the location details:
   - **Location Name** (required) - e.g., "Downtown Office", "West Branch"
   - **Address** - Street address
   - **City** - City name
   - **Province** - Province/State
   - **Postal Code** - ZIP/Postal code
   - **Contact Person** - First and last name
   - **Contact Email** - Email address
   - **Contact Phone** - Phone number
4. Click **Save**

**From SuperAdmin Portal:**
1. Edit the organization
2. Scroll to Locations section
3. Click **Add Location**
4. Enter the location name
5. Click **Add**

### Editing a Location

1. Open the Locations dialog for the organization
2. Click the **Edit** icon next to the location
3. Update the details
4. Click **Save**

### Deleting a Location

1. Open the Locations dialog
2. Click the **Delete** icon next to the location
3. Confirm deletion

**Warning**: You cannot delete a location that has:
- Active users assigned to it
- Courses assigned to it

The dialog shows usage counts (Users, Courses) to help you identify which locations are in use.

### Activating/Deactivating Locations

Locations can be deactivated instead of deleted:
- Deactivated locations remain in the database
- They won't appear in dropdown lists for new assignments
- Existing assignments are preserved

## Location Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| Location Name | Yes | Unique identifier within the organization |
| Address | No | Street address |
| City | No | City name |
| Province | No | Province or state |
| Postal Code | No | ZIP or postal code |
| Contact First Name | No | Primary contact's first name |
| Contact Last Name | No | Primary contact's last name |
| Contact Email | No | Contact email address |
| Contact Phone | No | Contact phone number |
| Is Active | Auto | Whether location accepts new assignments |

## Use Cases

### Multi-Branch Organizations
Organizations with multiple offices can track which branch requested each course and which branch's employees attended.

### Regional Management
Track training by region for compliance reporting.

### Billing by Location
Invoices can be associated with specific locations for departmental chargebacks.

### User Assignment
Users can be assigned to a default location, which auto-populates when they request courses.

## Troubleshooting

### "I can't see the Locations option"

1. **Check your role**: Only `admin`, `sysadmin`, and `accountant` can view locations
2. **Check which portal**:
   - SystemAdmin Portal: Look for the Location pin icon in Actions
   - SuperAdmin Portal: You must **Edit** an existing org (not create new)
3. **Organization must exist**: Locations can only be added to existing organizations

### "I can't add/edit/delete locations"

1. **Check your role**: Only `admin` and `sysadmin` can modify locations
2. **Accountants** have read-only access

### "I can't delete a location"

- The location may have users or courses assigned
- Check the usage counts in the dialog
- Reassign users/courses first, then delete

### "Locations aren't showing in dropdowns"

- The location may be deactivated
- Check the "Active" status in the Locations dialog

## Quick Reference

| Task | Portal | Action |
|------|--------|--------|
| View all locations | SystemAdmin | Click Location pin icon |
| Add location (full details) | SystemAdmin | Location pin > Add Location |
| Add location (quick) | SuperAdmin | Edit org > Add Location |
| Edit location | SystemAdmin | Location pin > Edit icon |
| Delete location | SystemAdmin | Location pin > Delete icon |
| See usage stats | SystemAdmin | Location pin (shows users/courses count) |

---

**Last Updated**: January 2026
**Version**: 1.0.0
