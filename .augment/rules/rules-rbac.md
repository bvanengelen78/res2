---
type: "manual"
---

# RBA (Role-Based Access) Rules

1. Each user has exactly one role: Regular User, Change Lead, Manager Change, Business Controller, or Admin.
2. Menu visibility is controlled entirely by role — if a role doesn’t have permission, the item should not be rendered at all.
3. Admins can assign and configure roles via a centralized UI.
4. Roles define component-level access, not field-level access.
5. All changes to user roles must be logged in an audit trail (visible only to Admins).
6. Role permissions must be stored centrally and dynamically evaluated in the frontend.
7. SSO users must be mapped to the correct internal role on first login.