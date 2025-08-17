---
type: "always_apply"
---

  - description: "Use only function components with hooks; do not use class components."
    appliesTo: ["react"]

  - description: "Use Tailwind CSS utility classes for styling. Do not use inline styles or custom CSS unless necessary."
    appliesTo: ["react", "tailwind"]

  - description: "Use shadcn/ui components for common UI (e.g., Button, Dialog, Input). Customize only when needed."
    appliesTo: ["react", "shadcn-ui"]

  - description: "Use TanStack Query for all asynchronous data fetching in React. Do not fetch directly with fetch/axios in components."
    appliesTo: ["react", "tanstack-query"]

  - description: "All React components must be typed with TypeScript. Avoid `any`; use `unknown` or strict interfaces."
    appliesTo: ["react", "typescript"]

  - description: "Use Wouter for routing. Use `<Route>`, `<Link>`, and `useLocation` appropriately."
    appliesTo: ["react", "wouter"]
