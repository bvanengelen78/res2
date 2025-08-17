---
type: "always_apply"
---

rules:
  - description: "Group Express routes logically (e.g., `/api/users`, `/api/orders`). Keep them lean; move logic to services."
    appliesTo: ["node", "express"]

  - description: "Use Supabase client methods for DB access. Avoid raw SQL queries unless absolutely necessary."
    appliesTo: ["node", "supabase"]

  - description: "Always validate input on the server with `zod` or equivalent schema validator."
    appliesTo: ["node", "express"]

  - description: "Use `dotenv` to access environment variables. Never hardcode secrets, keys, or URLs."
    appliesTo: ["node"]