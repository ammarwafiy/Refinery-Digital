---
name: frontend-design
description: "Use when designing, building, or refactoring user interfaces (UI/UX) in web applications. Triggers: UI components, dashboard design, Tailwind CSS styling, responsive layouts, dark mode, typography, micro-animations, glassmorphism, visual polish, and industrial/enterprise interfaces. Enforces high aesthetic standards, avoiding generic templates, and ensuring state-of-the-art visual excellence."
metadata:
  author: refinery-engineering
  version: "1.0.0"
---

# Frontend Design & UI/UX Standards

## Core Design Principles

### 1. Visual Excellence & First Impression (The "WOW" Factor)
- **Never create bare-bones or generic UIs.** Plain default buttons, standard HTML borders, and washed-out gray palettes signal unfinished work.
- **Deep Curated Dark Themes:** Use rich, layered dark themes (e.g. background `#090d16`, cards `#0f172a`, borders `slate-800/80`, accents cyan `#06b6d4`, emerald `#10b981`, amber `#f59e0b`).
- **Subtle Glassmorphism:** Incorporate subtle background blur (`backdrop-blur-md bg-slate-900/60 border border-slate-800/80`) to add depth and layering.
- **Typography Hierarchy:** Use clean monospace fonts (`font-mono`) for telemetry, numeric values, timestamps, and industrial labels; modern sans-serif (`Inter`, system UI) for headings and narrative text.

### 2. Micro-Interactions & State Responsiveness
- **Hover & Focus States:** Every interactive button, tab, and card must provide visual feedback:
  - Transition smoothing: `transition-all duration-200`
  - Subtle glow on hover: `hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/40`
  - Active button states: `active:scale-[0.98]`
- **Status Indicators & Badges:**
  - Active/Live: Glowing pulsing dots (`relative flex h-2 w-2`, `animate-ping`) with matching text badges.
  - Success/Normal: Emerald tones (`text-emerald-400 bg-emerald-950/60 border-emerald-800/60`).
  - Warning/Deviation: Amber tones (`text-amber-400 bg-amber-950/60 border-amber-800/60`).
  - Critical/Alarm: Rose/Red tones (`text-rose-400 bg-rose-950/60 border-rose-800/60`).
  - Locked/Disabled: Muted slate with lock icons (`text-slate-500 bg-slate-900 border-slate-800`).

### 3. Layout Architecture & Responsiveness
- **Mobile-First & Flexible Grid:** Use flexible CSS Grid and Flexbox (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`).
- **Information Density:** For enterprise/industrial tools (like SCADA or refinery logs), balance high data density with comfortable padding. Use tabbed navigation, collapsible sections, and modal inspectors for detailed JSON payloads.
- **Overflow & Scrolling:** Never allow accidental horizontal page overflow. For wide data tables, provide smooth horizontal scrolling wrappers (`overflow-x-auto`) with subtle scrollbars.

### 4. Components & Form Controls
- **Inputs:** Custom styled with dark backgrounds (`bg-[#090d16] border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500`).
- **Buttons:** Differentiate primary action buttons (vibrant gradient `bg-gradient-to-r from-cyan-600 to-blue-600`), secondary buttons (`bg-slate-800 hover:bg-slate-700 text-slate-300`), and destructive buttons (`bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300`).
- **Empty States:** When a list, table, or timeline has 0 items, never leave a bare blank space. Always render an informative empty state illustration/icon, a descriptive explanation, and a clear call-to-action (CTA).
