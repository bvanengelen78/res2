---
type: "always_apply"
---

rules:
  - description: "Follow feature-first folder structure (group by domain/functionality, not file type)."
    appliesTo: ["all"]

  - description: "All reusable logic (e.g., Supabase calls, business logic) must be abstracted into hooks or service files, not embedded in UI or route handlers."
    appliesTo: ["react", "node"]
