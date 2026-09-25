# Tool contract (Manus v6.1)

Authoritative schemas: `manus/tools-schemas.json`.
Full specification: `AGENTIC-FLOW-FORMAT.md`.

## Emission rules

1. One XML tag per call, one child tag per parameter. Raw values, never JSON-encoded.
2. No `arguments` wrapper. No code fence around the tag. No prose in the same emission.
3. Never nest one tool's tag inside another tool's parameter value.
4. Close any visible reasoning block before emitting a tag.
5. Emit multiple tags in one response only when the calls are independent.
6. Never claim a file was created, edited, tested, or built before the tool result says so.

## Before every call

Look the tool up in `manus/tools-schemas.json`:

- send every property in `required`;
- send nothing outside `properties` — all schemas are `additionalProperties: false`;
- respect `enum`, `minimum`, `maximum` and `pattern` constraints.

## Error codes

| Code | Meaning | Fix |
| --- | --- | --- |
| `E_NO_NAMESPACE` | Name had no `namespace--tool` separator | Use the full registry name |
| `E_UNKNOWN_TOOL` | Tool not in the registry | Run `bun run afe:catalog` |
| `E_MISSING_FIELD` | Required property absent | Re-read `required` |
| `E_UNKNOWN_FIELD` | Undeclared property sent | Re-read `properties` |
| `E_NO_EXECUTOR` | Cloud bridge absent | Do not fake a result |
| `E_NO_SESSION` | Host/browser bridge absent | Do not fake a result |
| `E_STUB_NOT_IMPLEMENTED` | Catalog-only tool | Choose a different tool |

## Gates

```bash
bun run afe:catalog   # enumerate every namespace--tool
bun run afe:format    # regenerate AGENTIC-FLOW-FORMAT.md from sources
bun run afe:verify    # fail on any contract defect (prevents error-oi)
```
