---
name: api-design-security
description: "Use when creating, auditing, or securing API endpoints, backend route handlers, and data transactions. Triggers: REST API design, input validation, authentication checks, role-based access control (RBAC), SQL injection prevention, Row Level Security (RLS) policies, OWASP Top 10 hardening, data sanitization, and secure audit logging."
metadata:
  author: refinery-engineering
  version: "1.0.0"
---

# API Design & Security Hardening

## Security Standards & Best Practices

### 1. Robust Input Validation & Sanitization
- **Validate at the Perimeter:** Never trust client-supplied input. Every payload sent to an API route must be validated before processing.
- **Strict Type Coercion:** Explicitly parse and validate numeric and boolean fields (e.g. ensuring `slot_index` is an integer between 0 and 23).
- **Sanitize Strings:** Strip or encode HTML tags and script injection characters from text remarks and user notes to prevent Cross-Site Scripting (XSS).

### 2. Authorization & Role-Based Access Control (RBAC)
- **Verify Identity on Every Request:** Check user authentication and session validity on sensitive endpoints.
- **Enforce Role Restrictions on the Server:**
  - `operator`: Permitted only to input hourly process logs for the currently active shift slot.
  - `qc_analyst`: Permitted only to enter lab test results.
  - `qc_manager`: Permitted to sign sample release dispositions.
  - `supervisor`: Permitted to sign shift lock verifications.
  - `admin`: Permitted to manage users and execute system data retention policies.
- Never rely solely on client-side button hiding or UI disabling for security; the server endpoint must strictly enforce permissions.

### 3. Database Security & Row Level Security (RLS)
- Keep RLS enabled on all production tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- Maintain specific policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- Protect immutable audit trails (`audit_log`) by disallowing `UPDATE` and `DELETE` operations completely.

### 4. Consistent REST API Response Schema
Maintain a standard JSON envelope across all endpoints:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```
Or on error:
```json
{
  "success": false,
  "error": "Descriptive human-readable error message",
  "code": "VALIDATION_FAILED"
}
```

### 5. Sensitive Information & Secret Management
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or admin tokens to client bundles or browser console outputs.
- Keep all secrets in `.env.local` or environment variables and access them only in Server Components or Route Handlers.
