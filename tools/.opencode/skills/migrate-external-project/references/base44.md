# Base44

## Get the code

When no source material is attached, lead with the ZIP path and one action at a time. Skip these steps when source material is already available.

1. Open the project in the Base44 editor.
2. Select the **⋯** menu in the top-right corner.
3. Select **Export project as ZIP**.
4. Attach the downloaded ZIP in this chat.

If the export action is not visible, ask the user to open **Code** and use the export icon in the top-right corner. Code export requires a Base44 Builder plan or higher. Link to the [Base44 export guide](https://docs.base44.com/Getting-Started/Quick-start-guide) only when the user needs more help.

Offer GitHub only when the user cannot download the ZIP or asks for it. Direct them to **⋯ → GitHub connection**, then ask for the full repository URL and clone it into a temporary directory. A URL pasted in chat works only for a public repository; for a private one, ask the user to start the import with **Import from GitHub** when creating the project, which connects GitHub under **Workspace settings → Git → GitHub** and places the code in the project. Never request a personal access token.

## Inspect Base44-specific behavior

Treat the ZIP as code and schema, not as a backup of Base44's managed cloud state.

Inspect:

- `@base44/sdk`, `@base44/vite-plugin`, and the Base44 client configuration
- `base44/entities/*.jsonc`, including fields, references, required values, and row-level security
- calls to `base44.entities`, realtime subscriptions, and bulk operations
- Base44 auth, protected routes, roles, OAuth flows, and provider-linked user IDs
- `base44/functions`, automations, integrations, public endpoints, and callbacks when present
- file uploads and stored Base44 media URLs
- payment, email, AI, analytics, and other external provider call sites

Do not run `base44 dev`, `base44 link`, package scripts, or imported code during inspection. A GitHub export may omit entity schemas, so infer nothing from their absence until relevant SDK call sites and the Base44 dashboard export are checked.

## Handoff

Request records after the preview, never before the build. When the app uses Base44 entities and no CSV export was attached, lead with **Next: add your existing data**, say the code ZIP does not contain the live records, ask for every table, and end with **Or reply “Skip for now.”**

1. In the Base44 project, open **Dashboard**.
2. Select **Data**.
3. On the first table card, select **⋯ → Export** to download its CSV.
4. Repeat for every table, including **User** when it is available.
5. Attach all CSV files in this chat.

Preserve original IDs, timestamps, references, ownership fields, and relation values when importing the CSVs. Verify the row count for every exported table and representative cross-table relationships.

Treat these as separate migration items:

- Base44 user rows are profile and authorization data, not portable passwords or sessions. Never request passwords, password hashes, access tokens, or sessions. Apply the main skill's existing-user auth decision. When preserving Base44 auth, retain `@base44/sdk`, the original app ID and client configuration, provider user IDs, and authenticated entity access. Verify a real sign-in and a protected backend request from the migrated app. Base44 supports [external authenticated clients](https://docs.base44.com/developers/references/sdk/getting-started/client); service-role operations remain in Base44-hosted functions or require an approved replacement.
- Database rows that reference Base44 media do not contain the file bytes. Request a separate file export when the app must retain uploaded images or documents.
- Recreate entity row-level rules as server-enforced authorization; do not reduce them to hidden UI controls.
- Recreate realtime subscriptions, functions, automations, webhooks, and integrations from their call sites and configuration. Do not assume they are included just because the frontend compiles.
