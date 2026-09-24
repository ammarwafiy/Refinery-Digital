# Professional Redesign Plan — Kill the AI Slop

## Design Philosophy
**Reference**: Think Notion, Linear, Stripe Dashboard, GitHub — clean enterprise tools that real UX teams ship.

**NOT**: SCADA terminals, neon glows, cyber dark themes, glassmorphism.

## Color Palette (Light, Professional)

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `#ffffff` | Page background |
| `--surface` | `#f8fafc` | Card/panel backgrounds (slate-50) |
| `--surface-raised` | `#ffffff` | Elevated cards with shadow |
| `--border` | `#e2e8f0` | All borders (slate-200) |
| `--border-strong` | `#cbd5e1` | Emphasized borders (slate-300) |
| `--text-primary` | `#0f172a` | Headings, primary text (slate-900) |
| `--text-secondary` | `#475569` | Body text (slate-600) |
| `--text-tertiary` | `#94a3b8` | Muted labels (slate-400) |
| `--accent` | `#2563eb` | Primary blue — buttons, active states (blue-600) |
| `--accent-hover` | `#1d4ed8` | Hover state (blue-700) |
| `--accent-light` | `#eff6ff` | Active tab bg, light highlight (blue-50) |
| `--success` | `#16a34a` | Online status, pass (green-600) |
| `--warning` | `#d97706` | Caution, deviation (amber-600) |
| `--danger` | `#dc2626` | Error, critical (red-600) |

## Rules
1. **White backgrounds everywhere** — no dark cards, no dark body
2. **One accent color**: Blue-600 for buttons and active states
3. **Shadows**: Use `shadow-sm` or `shadow` — never colored glows
4. **Borders**: Simple `border-slate-200` — no colored/glowing borders
5. **Status colors**: Green/amber/red — standard, no glow effects
6. **Typography**: Inter (already loaded), normal weights, no mono for regular text
7. **No uppercase tracking-wider labels** for regular UI — save mono for actual data values
8. **Touch targets**: Keep existing sizes (already ≥44px), just change colors

## Files to Modify (10 total)
1. `app/globals.css` — Complete palette rewrite
2. `app/layout.tsx` — Remove `dark` class, update body colors
3. `app/page.tsx` — Light backgrounds, clean footer
4. `components/Navbar.tsx` — White header bar, blue active tabs
5. `components/LoginView.tsx` — Clean white card login
6. `components/sidebar-shell.tsx` — Light sidebar
7. `components/SupervisorBoardView.tsx` — Light cards
8. `components/AnalyticsTrendsView.tsx` — Light cards
9. `components/ProcessLogView.tsx` — Light data tables
10. `components/SampleLabView.tsx` — Light cards
11. `components/OfficialFormsExportView.tsx` — Light cards
12. `components/ReportExportView.tsx` — Light cards
13. `components/AdminUserManagementView.tsx` — Light cards

## Execution Order
1. globals.css (foundation)
2. layout.tsx (root wrapper)
3. page.tsx (shell)
4. LoginView.tsx
5. Navbar.tsx
6. All view components (batch replace hex codes)
