---
name: systematic-debugging
description: "Use whenever troubleshooting, debugging runtime errors, resolving unexpected UI/data behavior, investigating crashes, or analyzing unexpected side-effects. Triggers: debugging bugs, fixing errors, investigating sync failures, inspecting state mismatches, diagnosing regression issues, and tracing root causes. Enforces a scientific 4-phase debugging methodology over trial-and-error."
metadata:
  author: refinery-engineering
  version: "1.0.0"
---

# Systematic Debugging Protocol

## The 4-Phase Scientific Method

When unexpected behavior or errors occur, DO NOT make random code changes or guess fixes. Follow this 4-phase protocol strictly:

### Phase 1: Observation & Evidence Collection
1. **Gather Concrete Telemetry:**
   - Exact error messages, stack traces, HTTP status codes, and browser console warnings.
   - Network payload request/response bodies (check headers, status, response JSON).
   - Database table state before and after the action.
2. **Reproduce Deterministically:**
   - Establish the minimum reproducible scenario (user role, exact inputs, sequence of clicks).
   - If the issue happens intermittently, inspect race conditions, asynchronous state updates, or local storage caching.

### Phase 2: Hypothesis & Root Cause Isolation
1. **Trace the Data Flow:**
   - Data Source (Supabase table / API Route) $\to$ Service Layer (`data-service.ts`) $\to$ React State (`useState` / `useEffect`) $\to$ UI Render (`JSX`).
   - Pinpoint the exact transition where state diverges from expected values.
2. **Formulate a Testable Hypothesis:**
   - Identify *why* the divergence occurred (e.g. "The query filter uses `<` instead of `<=`, excluding today's records" or "The reseed script seeded all 24 slots, marking `isFilled` as true for future slots").
3. **Verify Hypothesis Before Changing Code:**
   - Check database records directly via scripts or CLI.
   - Verify code logic against historical Git diffs (`git log -p -S ...`).

### Phase 3: Surgical Fix & Scope Control
1. **Apply the Minimal Sufficient Change:**
   - Address the root cause directly at the appropriate architectural layer.
   - Avoid adding hacky workarounds in UI components if the root cause is in the backend/database, and vice versa.
2. **Guard Against Regressions:**
   - Ensure the fix doesn't break adjacent flows (e.g. fixing today's live shift must not corrupt past verified historical shift logs).

### Phase 4: Verification & Closure
1. **Test the Happy Path and Edge Cases:**
   - Test with 0 records, 1 record, full data, future slots, and past slots.
2. **Run Build & Static Analysis:**
   - Execute `npm run build` or `npm run type-check` to confirm zero TypeScript compilation errors.
3. **Document the Fix:**
   - Note the symptom, root cause, and remediation clearly in commit messages and documentation.
