---
name: nextjs-app-router
description: "Use when developing, modifying, or architecting pages, layouts, route handlers, server actions, or configuration in Next.js 15/16 App Router projects. Triggers: Next.js, app router, server components, client components, proxy/middleware, hydration errors, metadata, API routes, Turbopack, and static/dynamic rendering."
metadata:
  author: refinery-engineering
  version: "1.0.0"
---

# Next.js App Router Best Practices (Next.js 15/16+)

## Architectural Guidelines

### 1. Server vs. Client Component Boundaries
- **Default to Server Components:** Keep pages and data-fetching components as Server Components by default for optimal performance, zero client bundle weight, and direct database access.
- **Use `'use client'` only where necessary:**
  - Interactive event listeners (`onClick`, `onChange`, `onSubmit`).
  - React State & Lifecycle hooks (`useState`, `useEffect`, `useReducer`, `useCallback`).
  - Browser-only APIs (`localStorage`, `window`, `navigator`).
  - Real-time WebSocket subscriptions (Supabase Realtime).
- **Push Client Boundaries Down:** Do not place `'use client'` at the root of a large page. Keep the page as a Server Component and encapsulate interactive elements (e.g. `ProcessLogView`, `TimeSlotNavigator`) in focused client components.

### 2. Modern Route Handlers & Server Actions
- **Route Handlers (`app/api/.../route.ts`):**
  - Export standard HTTP method functions (`GET`, `POST`, `PUT`, `DELETE`).
  - Always return standard `NextResponse.json(...)` with explicit HTTP status codes.
  - Wrap database operations in `try / catch` blocks and return structured error objects `{ success: false, error: string }`.
- **Server Actions:**
  - Mark with `'use server'`.
  - Validate all incoming arguments with schemas (e.g. Zod) before executing mutations.

### 3. Middleware & Proxy Convention (Next.js 16+)
- Note the deprecation of legacy `middleware.ts` in favor of `proxy` convention in modern Next.js releases.
- Ensure authentication checks and session refresh cookies are handled smoothly without causing infinite redirect loops on protected routes (`/dashboard`, `/process`, `/samples`).

### 4. Hydration Safety & Client Storage
- **Never read `localStorage` or `window` during initial SSR render:**
  ```tsx
  // BAD: Causes Hydration Mismatch
  const [data, setData] = useState(localStorage.getItem('key'));

  // GOOD: Initialize with safe default, populate in useEffect
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    setData(getStored('key', defaultVal));
  }, []);
  ```
- Use `suppressHydrationWarning` only on dynamic timestamp displays if unavoidable.

### 5. Turbopack & Production Build Verification
- Always test local builds using `npm run build` with Turbopack enabled.
- Verify that dynamic routes (`app/samples/[id]/page.tsx`) correctly handle asynchronous `params` resolution as required by recent Next.js specifications (`const { id } = await params`).
