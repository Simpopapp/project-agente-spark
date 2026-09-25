---
name: accessibility
description: Audit a project for accessibility issues and fix them. Triggers on "check accessibility", "a11y review", "accessibility audit", "make it accessible", "screen reader", "WCAG", "aria labels", "keyboard navigation", "fix accessibility".
---

# Accessibility Review

Audit the project for accessibility issues, report findings by severity, and fix them one at a time.

## Steps

### 1. Capture the current state

Take a screenshot of the current preview so you have visual context for the audit.

### 2. Read and audit the code

Read through the project's components and pages. Check for these issues in priority order:

**Critical (blocks users)**
- Images without `alt` attributes
- Icon-only buttons and links missing `aria-label`
- Form inputs without associated labels (visible or `aria-label`)
- `onClick` handlers on non-interactive elements (`div`, `span`) without `role` and keyboard support
- Focus traps with no escape mechanism
- `aria-hidden="true"` on elements that contain focusable children

**Warning (degrades experience)**
- Skipped heading levels (e.g. `h1` to `h3`)
- Missing `<main>` landmark or multiple `<main>` elements
- `tabIndex` values greater than 0
- Missing focus-visible indicators on interactive elements
- Tap targets smaller than 44x44px on mobile
- `autoFocus` used outside of modals/dialogs
- Color as the only way to convey information (error states, status indicators)
- `h-screen` instead of `h-dvh` for mobile viewport

**Info (best practice)**
- Decorative images that should use `alt=""`
- Redundant ARIA (e.g. `role="button"` on `<button>`)
- Missing `aria-live` regions for dynamic content updates
- Lists not using semantic `<ul>`/`<ol>` markup
- Missing `lang` attribute on `<html>`

### 3. Report findings

Summarize what you found grouped by severity. For each issue include:
- What the problem is
- Which file and component it affects
- Why it matters (what breaks for which users)

Start with the critical count. If everything passes, say so clearly.

### 4. Fix issues

Offer to fix the issues starting with critical ones. Work through them one at a time. For each fix:
- Use accessible component primitives (Radix/shadcn) instead of building keyboard or focus behavior by hand
- Add `aria-label` to icon-only buttons rather than wrapping in visually-hidden text
- Use `h-dvh` instead of `h-screen` for full-height layouts
- Never rebuild focus management that Radix already provides
