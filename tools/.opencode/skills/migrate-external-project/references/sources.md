# Other sources

## GitHub and code archives

When the first message says the repository was imported into this project, or the working tree already holds its code, the working tree is the source: inspect it in place and never clone again. A repository URL pasted in chat works only for a public repository; clone it into a temporary directory. For a private repository, ask the user to start the import with **Import from GitHub** when creating the project, which connects GitHub under **Workspace settings → Git → GitHub** and places the code in the project. Never request a personal access token.

For an archive (`Source: code archive` or `Source: Other`), inspect the attached ZIP; ask the user to attach one only when nothing is attached. Exclude `.env`, credentials, private keys, dependency folders, build output, and local database files. If it is too large, remove `node_modules`, `.git`, build output, and caches rather than weakening archive limits.

Extract archives only into a temporary directory. Do not run install, build, lifecycle, Git hook, or package scripts before inspection.

## Handoff

Repositories and archives rarely include record exports. Identify the database provider from the code and configuration (Supabase, Neon or another Postgres behind Prisma or Drizzle, MongoDB, Firebase, PlanetScale). After the preview, lead with **Next: add your existing data**, name the provider, ask for CSV or JSON exports of the application tables from that provider's dashboard, exclude auth credential tables and secret values, and end with **Or reply “Skip for now.”**

## Published sites

Ask for the published URL and any export the service provides. When the `import_website` tool is available, use it to capture the published site; otherwise rebuild the pages from the export and the live URL.

- Webflow: request an HTML/CSS/JS export and CMS collections when applicable.
- Squarespace: request available page or content exports; commerce, memberships, and account data may require recreation.
- Framer: request available assets or code and identify forms, CMS collections, analytics, and embeds.

Static sites have no database step. When forms, memberships, commerce, CMS, or another dynamic service is detected, preserve or recreate it and request that provider's export after the preview with the same **Next: add your existing data** handoff.
