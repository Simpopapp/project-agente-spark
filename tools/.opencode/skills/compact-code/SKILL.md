---
name: compact-code
description: Rewrite existing code to the smallest form that behaves identically — remove duplication and dead code, reuse the framework and existing components, collapse special cases into the general one, and model state so bad states cannot happen. The result must still build and behave exactly as before, and stay readable. Use when the user asks to compact, shrink, tighten, simplify, clean up, or reduce the size or complexity of their code.
---

# Compact code

When the user asks to shrink, tighten, simplify, or clean up code, rewrite it as
the smallest version that behaves exactly the same. Smaller code is easier to
maintain and to change next — fewer moving parts, fewer places for a bug to
hide. The largest reductions come from a better representation of the problem,
not from squeezing lines into something clever.

> The app must keep working exactly as before — same UI, same behavior, same
> data, same public interfaces. Know how to check the affected flow before you
> start, confirm the build stays clean and the behavior is unchanged after, and
> never trade correctness for fewer lines.

## What to do

- **Remove duplication** — copy-pasted blocks become one function, component, or
  a small loop.
- **Delete dead code** — unused components, props, variables, imports, and
  branches that cannot run.
- **Reuse what exists** — existing components, hooks, utilities, and the design
  system instead of re-implementing them, and built-in language and framework
  features instead of hand-rolled versions.
- **Collapse special cases** — find the general form so the edge cases fall out
  on their own.
- **Make bad states impossible** — model state with a type that cannot hold an
  invalid combination, so the runtime guards that checked for it disappear.
- **One source of truth** — derive values instead of copying the same fact
  across state, props, and constants.

## Keep it readable

This is not code golf. Fewer lines only counts when the result is also easier to
read and change. If a shorter version is denser or harder to follow, keep the
clearer one and match the app's existing style. Do not introduce clever
one-liners the user will struggle to edit later.

## Don't change

- What the app does, its visible behavior, or its data.
- Public interfaces, exported names, API shapes, and routes other code relies on.
- Anything you cannot verify still works.
