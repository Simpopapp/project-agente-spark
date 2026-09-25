---
name: shopify-global-catalog
description: Use when building shopping or product-discovery features that span many Shopify merchants — cross-merchant product search, comparison shopping, gift finders, recommendations, variant selection, or checkout links — via Shopify's Global Catalog MCP. Not for connecting or managing a user's own Shopify store (Admin/Storefront APIs, product sync, order webhooks).
---

# Shopify Global Catalog

Shopify's Global Catalog MCP serves live product data from across all Shopify
merchants — no merchant onboarding, and no API key needed to start. Send
JSON-RPC `tools/call` requests to `https://catalog.shopify.com/api/ucp/mcp`
using three tools: `search_catalog` (text, image, or similarity search with
filters), `lookup_catalog` (resolve known product IDs to current data), and
`get_product` (full details with variant selection). Every call must carry a
UCP agent profile in `arguments.meta.ucp-agent.profile`. The keyless tier has
fixed rate limits; a Shopify Dev Dashboard key (Client ID + Client secret,
exchanged at runtime for a short-lived bearer token) raises them.

**Read the canonical docs before writing proxy or client code** — request
shapes, filters, response fields, and authentication details live there:
https://shopify.dev/docs/agents/catalog/global-catalog

Rules that hold regardless of stack:

- Call the catalog only from the project's server boundary — never from the
  browser. In production, require app auth before forwarding requests.
- The Client ID and secret are server-side secrets (never `VITE_`-prefixed);
  derive the bearer token at runtime, never hardcode one.
- Send only shopping intent in `context.intent` — no names, emails, or
  addresses — and keep raw payloads out of logs.
- Format prices from minor units plus the response currency code
  (`Intl.NumberFormat`); never assume `/100` or USD.
- Link out via the returned product/checkout URLs, preserving their
  attribution params; fetch product data fresh rather than caching it.
- Check for a JSON-RPC `error` even on HTTP 200; paginate on `has_next_page`.
