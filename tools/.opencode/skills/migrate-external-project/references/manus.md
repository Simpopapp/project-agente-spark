# Manus

## Get the code

When no source material is attached, lead with one action and do not mention GitHub in the first response. Skip these steps when source material is already available.

1. Tell the user to open the chat inside the Manus project they want to move, not a new Manus task.
2. Give them this exact prompt:

   ```text
   Prepare this project for migration to Lovable.
   Create one ZIP file for moving it to Lovable and give me a download link.

   Include:
   - frontend and backend code
   - assets and dependency files
   - database schema and migrations
   - configuration files
   - an .env.example file, or another plain-text environment template, that lists required variable names with blank values

   Do not include:
   - .env files, secrets, or credentials
   - passwords, password hashes, or session tokens
   - dependency folders or build output

   Do not export database records yet.
   Do not change the existing application code or behavior.
   ```

3. Ask them to download the ZIP Manus creates, then attach it in this chat.

Say Lovable will inspect the code first. If it uses a database, Lovable will give them a second prompt to export every table. Auth users and uploaded files are checked separately. Link to [Manus Code Control](https://manus.im/docs/website-builder/code-control) only when the user needs more help.

## GitHub fallback

Give this only when the user cannot download the ZIP or asks for GitHub:

1. In the open Manus project, select the GitHub icon or open **Settings → GitHub**.
2. Authorize GitHub, choose an owner and repository name, then create the repository.
3. If the repository is already public, paste its full URL in chat; clone it into a temporary directory for inspection. Keep private repositories private and use the next step instead.
4. For a private repository, ask the user to start the import with **Import from GitHub** when creating the project instead, which connects GitHub under **Workspace settings → Git → GitHub** and places the code in the project. Never request a personal access token.

## Handoff

Request records after the preview, never before the build. When the inspected project uses a database and no record export was attached, lead with **Next: add your existing data**, say the preview does not include existing records, and give this exact prompt for the chat inside the same Manus project:

```text
Export the existing database data for this project so I can move it to Lovable.

Export every database table or collection.
Create one JSON or CSV file per table or collection, preserve every original ID and relationship, put all files in one ZIP, and give me a download link.

Do not include passwords, password hashes, sessions, API keys, credentials, or .env files. Do not change the existing application code or behavior. You may create export-only files needed for the ZIP.
```

Ask the user to download and attach the resulting ZIP, then end with **Or reply “Skip for now.”**

Treat Manus-managed records, auth identities, uploaded file bytes, schedules, and secrets as separate capabilities. Manus OAuth (`OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID`) is platform-bound: apply the skill's platform-bound auth rule and keep exported user rows as profiles. `BUILT_IN_FORGE_*` and `VITE_FRONTEND_FORGE_*` configure Manus's own runtime: never request them as secrets; replace their functionality or record a blocker. Use a blank environment template only to identify the remaining required variable names, then request those values through Lovable's secure secret flow.
