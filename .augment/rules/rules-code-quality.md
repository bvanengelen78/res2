---
type: "always_apply"
---

  - description: "Ensure consistent formatting using Prettier. Lint code with ESLint configured for TypeScript + React."
    appliesTo: ["all"]

  - description: "Follow semantic naming for files and components (e.g., `ProductCard.tsx`, not `card2.tsx`)."
    appliesTo: ["all"]

  - description: "Document exported functions and custom hooks with concise TSdoc comments."
    appliesTo: ["typescript"]

  - description: "All commits must follow Conventional Commit format (e.g., `feat:`, `fix:`, `refactor:`)."
    appliesTo: ["git", "ci"]
