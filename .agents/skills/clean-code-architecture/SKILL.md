---
name: clean-code-architecture
description: "Use when structuring, organizing, refactoring, or reviewing code architecture in full-stack TypeScript projects. Triggers: code organization, separation of concerns, SOLID principles, refactoring spaghetti code, modularity, type definition design, DRY principles, and maintainability standards."
metadata:
  author: refinery-engineering
  version: "1.0.0"
---

# Clean Code & Software Architecture

## Core Architectural Rules

### 1. Separation of Concerns (Layered Architecture)
Maintain strict layer boundaries across the application:
1. **Presentation Layer (`components/`, `app/`):**
   - Responsible strictly for rendering UI, handling user interaction events, and displaying visual states (loading, error, success).
   - Must NOT contain raw SQL queries or direct multi-step business logic orchestration.
2. **Service / Domain Layer (`lib/data-service.ts`, `lib/auth-service.ts`):**
   - Encapsulates pure business rules (e.g. calculating deviations against soft/hard bands, auto-dispatching QC samples, determining shift active hours).
   - Functions should be deterministic, well-named, and unit-testable.
3. **Data Access Layer (`lib/supabase.ts`, API routes):**
   - Manages communication with external data stores (Supabase REST, Supabase Realtime, PostgreSQL).
   - Handles schema mapping, serialization, and error normalization.

### 2. Strict Type Safety (Zero `any`)
- Centralize shared interfaces and domain entities in `types/` (e.g. `types/refinery.ts`).
- Avoid the `any` escape hatch. Use Discriminated Unions for multi-state responses:
  ```ts
  type ServiceResult<T> = 
    | { success: true; data: T }
    | { success: false; error: string; code?: string };
  ```
- Use `readonly` arrays and strict string literals/enums for fixed domain states (`'awaiting_results' | 'accepted' | 'rejected' | 'reblend'`).

### 3. Modularity & Function Design
- **Single Responsibility Principle (SRP):** Each function should perform one clear task. If a function is doing data validation, database persistence, audit logging, and triggering side-effects, decompose it into focused helper functions.
- **Pure Functions where possible:** Isolate calculation logic (e.g. `isWithinSoftBands(value, min, max)`) as pure functions with no side-effects for reliable predictability.
- **Fail Early:** Validate preconditions at the top of functions using guard clauses and return immediately if conditions are not met, avoiding deeply nested `if/else` blocks.

### 4. Resilient Error Handling
- Never swallow errors silently with empty `catch {}` blocks.
- Log meaningful diagnostic messages with contextual metadata (`[ModuleName] Operation failed for ID: ...`).
- Provide human-readable, actionable error messages to the user interface rather than cryptic database error codes.
