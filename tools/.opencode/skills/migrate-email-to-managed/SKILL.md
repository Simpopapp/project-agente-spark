---
name: migrate-email-to-managed
description: Migrate a Lovable project's email sending from self-owned queue infrastructure (pgmq queue, cron dispatch, legacy edge functions or server routes) to Lovable-managed email delivery. Covers the consent-gated start_email_migration call and the Lovable-funded rewrite turn that converts auth and app-email code to the managed email API, deletes the legacy queue scaffolds from the repo, and leaves the app buildable for the user to review and publish. Use when the user asks to migrate, switch, or upgrade their project's email sending to Lovable-managed email, update their email-sending version, or when a turn starts with the managed-email migration instruction.
---

# Migrate email sending to Lovable-managed delivery

This skill moves a project off its self-owned email queue (pgmq + cron + dispatch functions in the project's Supabase) onto Lovable's managed email API, where delivery, retries, suppression, and unsubscribe handling run on Lovable's side.

A migration has two separate turns with different jobs:

1. **The consent turn** — the user asks for the migration; you call `email_domain--start_email_migration`. No email code changes in this turn.
2. **The funded rewrite turn** — a later Lovable-funded turn (it costs the user no credits) opens with the fixed instruction "Migrate this project's email sending to Lovable-managed email delivery." and you perform the rewrite below.

Server-side gates re-verify everything: eligibility, edit access, and consent are enforced by the migration workflow, not by this document.

## Ground rules (both turns)

- **Consent is collected once, through the tool.** Follow `start_email_migration`'s description: the canonical Lovable migration prompt carries consent; anything else gets exactly one yes/no question. Never treat enthusiasm as consent, never re-negotiate consent in prose, and never call the tool from your own initiative.
- **Use the update abstraction with the user.** Call it an email update or version. Describe review, publish, expiry, and permanence without mentioning migrations, managed delivery, queues, or infrastructure.
- **Publish is the point of no return.** Until the user publishes, nothing user-visible changes and the migration can be abandoned; after they publish, the switch to managed email is permanent. Present it that way — there is no un-migrate.
- **Never publish the project yourself.** The rewrite ends with a buildable tree for the user to review.
- **Never undeploy or delete deployed edge functions.** The live published app keeps using the deployed legacy senders until cutover; the workflow undeploys them after teardown. Deleting the files from the repo is your job; touching deployments is not (`supabase--delete_edge_functions` refuses the legacy email functions mid-migration by design).
- **Never touch send-mode markers or project settings.** The workflow flips the project to managed sending after teardown.
- **Keep the data tables.** `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, and `email_send_state` are user data — never drop them, and never write a migration that does.

## Starting a migration (consent turn)

1. Confirm consent per the tool description, then call `email_domain--start_email_migration`.
2. The tool self-checks and refuses when the project is already managed, the stack is ineligible, the database is not Lovable-managed, a migration is already running, or too many unsent emails are stuck in the queue. Relay a refusal as given — do not retry around it or improvise fixes.
3. On success, relay the tool's software-update message exactly. Then stop — do not start rewriting email code in this turn.

## The funded rewrite turn

The turn opens with the fixed migration instruction. While the migration record is in flight, your email guides and email tools are already the managed variants for this project's stack — follow them for all managed code shapes; this section owns the order, the delete list, the bail rule, the direct `sendLovableEmail` conversion, and the events receiver.

**Ended-migration rule:** the rewrite instruction can outlive its migration — the turn that carried it may have been stopped. Before any rewrite work, whether this turn opened with the migration or continuation instruction or you picked it up from an earlier unanswered one, check your tools: if `email_domain--report_email_migration_blockers` is missing, this turn cannot run the rewrite. Make no email changes of any kind — no scaffolds, no rewrites, no deletions — and tell the user their email setup is unchanged. This rule gates rewrite work only; it never applies to the consent turn.

The turn is headless: no one can answer a question, and a pause for input fails the migration permanently. Never ask the user anything in this turn — consent was already collected. Where the code offers a genuine fork, take the conservative option and note it in the step 6 report.

**Decline rule:** when the user's latest word in the conversation about this email update is a decline — they asked not to proceed after consenting — call `email_domain--report_email_migration_decline` before any edits, then end the turn confirming that nothing changed and their email keeps working unchanged.

### 1. Survey first — the bail rule

Before editing anything, inventory every legacy email surface:

- Classic stack: invocations of the `send-transactional-email` function and `enqueue_email` RPC calls across `src/` and `supabase/functions/`.
- Modern (TanStack) stack: calls to the `/lovable/email/transactional/send` route and any direct queue writes.
- Both: the legacy scaffold files listed in step 5, and any `supabase/migrations/*_email_infra.sql` file.

Read the full contents of every step-5 file and the `*_email_infra.sql` migration before your first edit — never rewrite or delete a file unread. Record every app-table write the scaffolds perform (table, columns, the exact status/reason strings, and the trigger it fires on) and the migration's CHECK constraints: deleting the migration file removes nothing from the database, so those constraints keep rejecting any other strings after the rewrite. Diff what you read against the legacy email data contract at the end of this document — writes beyond the stock contract are user customization to preserve (or bail on).

**Bail rule:** stop before making any edit only when a send call site has no faithful transport swap: a third-party email SDK wired into the queue or dispatch functions (converting it would change the user's email provider), user modifications to the queue RPCs or dispatch internals you cannot map, or behavior hooked on queue internals that no managed equivalent expresses (step 3 maps the equivalents). Nothing else bails — a sender's own subject, HTML, or recipient handling is user content to convert in step 3. That includes a sender that loops over a recipient list: the email guides' refusals of list sends and bulk patterns govern new email features, not this conversion. When bailing, first call `email_domain--report_email_migration_blockers` with each blocking file and the category that fits it (the three bail conditions above map to the tool's categories), then end the turn with a report explaining what blocks the update and that their email setup keeps working unchanged. Do not partially migrate. An untouched project drops out of the migration safely on its own.

### 2. Re-render the auth emails

Call `email_domain--scaffold_auth_email_templates` with `confirm_overwrite: true`. It re-renders the auth email hook for managed sending (direct send through Lovable's email API — no queue) along with the six auth templates, and its output lists the required package changes.

If the user had customized the auth templates (branding, copy), re-apply those customizations to the re-rendered template files. The hook function itself must stay exactly as rendered.

### 3. Convert app-email sends

Call `email_domain--scaffold_transactional_email_templates` to create the managed template registry and send helper, then convert each feature's send call site to the scaffolded helper following the app-emails guide. Keep each feature's send in its own server code path (edge function or server route); when authoring new senders: one trigger, one recipient, no loops over recipient lists, and no generic send endpoint. Existing senders convert as they are — the email guides' refusals of list sends and bulk patterns govern new email features, not the conversion of code the user already has. A sender with its own subject and hand-written HTML is re-authored as a registered template in the guide's shape, preserving its copy — convert the transport, never the content.

The helper is the default target, not the whole managed surface. A sender whose behavior the registry shape cannot carry — it assembles or post-processes its HTML at send time (link rewriting, per-send composition), or builds subject or content in ways template props cannot express — converts to a direct `sendLovableEmail` call in the same server code path instead of bailing. Import `@lovable.dev/email-js` the way the scaffolded helper does, produce the `html` and `text` yourself, and mirror the helper's request shape (`from`, `sender_domain`, `purpose: 'transactional'`, a `label`, an idempotency key) and its `{ apiKey, sendUrl }` options argument. The guides' helper-only and no-unsubscribe-surface rules — and the scaffold output's all-sends-go-through-the-helper line — govern new email features, not these conversions.

The queue-processor and send files that step 5 deletes carry app behavior beyond transport; the survey's record of their app-table writes transfers to the managed send path. Reproduce each write at its managed-equivalent trigger: a `'sent'` row after `sendTemplateEmail` returns `{ sent: true }`, a `'suppressed'` row when it returns `{ sent: false, reason: 'recipient_suppressed' }`, a `'failed'` row with the error message when it throws, and any user-added side effect at the point matching where it fired in the legacy flow. A direct `sendLovableEmail` conversion maps the same rows: `'sent'` when it resolves, `'suppressed'` on an `EmailAPIError` with code `'recipient_suppressed'`, `'failed'` on any other throw. A column whose source died with the queue (the queue message's `message_id`) may be null. Check these writes' returned `error` and console-log a failure — a log row never decides the send result.

Do not reproduce transport mechanics — batch reads, retry and rate-limit cooldowns, TTL expiry, DLQ moves, and their `'pending'`/`'dlq'` rows: Lovable's managed delivery owns those and the platform email logs record them. Honoring the guides' 429 rule in a converted loop — wait `retryAfterSeconds` before retrying a 429'd send — is sender behavior, not a transport mechanic: that transport-mechanics rule covers the queue's persisted cooldown state and rows, not an in-request wait. Do not reproduce pre-send suppression checks or unsubscribe-token issuance — Lovable enforces suppression at send time and hosts unsubscribe. A user-added behavior hooked on queue internals converts through `@lovable.dev/email-js` when it can express the behavior:

- delivery-outcome reads move to `listEmailLogs` (the DLQ's contents surface there as rejections);
- behavior reacting to a bounce, complaint, or unsubscribe moves into the step-4 events receiver;
- code that reads or sets a recipient's unsubscribe state uses `getEmailUnsubscribe`/`setEmailUnsubscribe` (recipient plus the scaffolded `SENDER_DOMAIN`, authenticated like the helper's send); a complaint suppression is not liftable.

Bail per step 1 only when none of those express it — scheduling or cancelling queued sends, behavior triggered by a dead-lettered send (no receiver event carries rejections), or logic hooked on per-message retry attempt counts.

### 4. Scaffold the events receiver

Call `email_domain--scaffold_email_events_receiver`. It renders the receiver's wiring at the contract path (`supabase/functions/handle-email-events/index.ts` on classic stacks, `src/routes/lovable/email/events.ts` — or `.tsx` — on modern; any other path deploys fine but never receives an event): the signature-verifying handler with log-only placeholder bodies. Never author the wiring by hand. The tool leaves an existing receiver untouched — if it reports one already present (an earlier turn may have written it freehand), audit that file's writes against the data contract below and fix drifted strings or unchecked `error` results in place.

The receiver is required whenever the migration removes a suppression or unsubscribe surface — in this turn's step-5 delete list or an earlier turn's: those functions were the app's outcome-reacting code, so this is the guide's needs-to-react case and the receiver replaces them — not the read-delivery-history case its create-only rule waves off. If the migration removes neither, the guide's rule applies as written; note the skip in the step 6 report.

Replace the placeholder bodies with the kept-table writes: reproduce the stock legacy handlers' writes from the legacy email data contract below (the queue-era `metadata` has no webhook source and stays `null`). Before step 5 deletes them, diff the legacy suppression and unsubscribe handlers against that contract: where they diverge, that delta is user customization — port it too, copying the legacy file's exact tables and strings (the managed guides' no-suppression-tables rule forbids creating new tables, not writing the kept ones — notification-only, never send-gating). Do not rename or modernize a stored string — the live CHECK constraints reject anything else, and the Supabase client reports the rejection in its return value rather than throwing, so a drifted write drops the row with no error anywhere. Check every write's returned `error` and throw on failure — a thrown handler returns 500 and the delivery is retried. Where a handler logs a failure, log the error's `{code, message}` and `event.event_id` only — never the raw recipient.

On classic stacks deploy the new function with `supabase--deploy_edge_functions` alongside the other re-rendered functions — deploying provisions its `LOVABLE_API_KEY`. The terminal-event hooks register automatically at cutover.

### 5. Delete the legacy scaffolds (repo only)

Delete nothing until every replacement from steps 2–4 exists and typechecks — deletion is the migration's completion signal (the workflow's probes and continuation nudges key on these files still being present), so it comes last. Apply any package removals after this step, never before — the legacy files still import those packages.

Delete these from the repo — the published app's deployed copies keep serving users until cutover, which is exactly why you never undeploy them:

- Both stacks: every `supabase/migrations/*_email_infra.sql` file.
- Modern stack — the route files (`.ts` or `.tsx`) under `src/routes` for:
  - `/lovable/email/queue/process`
  - `/lovable/email/suppression`
  - `/lovable/email/transactional/send`
  - `/email/unsubscribe` (the public unsubscribe route — Lovable hosts unsubscribe on the managed path)
- Classic stack — the function directories and their `supabase/config.toml` blocks for:
  - `process-email-queue`
  - `handle-email-suppression`
  - `handle-email-unsubscribe`
  - `send-transactional-email`

Keep the auth hook and email preview surfaces — they are re-rendered in place, never deleted. The publish check probes for exactly the files above; leftovers block the migration from completing, and deleting more than this list risks breaking unrelated code.

### 6. Verify and report

- Build the project; it must pass. Fix build errors caused by the rewrite. Leave the tree buildable — and do not publish.
- Report that the email update is ready to review and their live app is unchanged until they publish. Ask them to publish when satisfied, and remind them that publishing completes the update and cannot be undone.

## Continuation turns

A turn starting "Continue the email sending migration" lists legacy scaffold paths still present after a previous rewrite settled. Resume — do not restart, do not call `start_email_migration` again, and do not revert earlier work. Rewrite or delete exactly the listed paths following steps 2–5, apply the same ended-migration, bail, and decline rules, scaffold the events receiver if step 4 requires one and it is still missing (an earlier turn may already have deleted the legacy handlers — the data contract below and `git show` recover the customizations to port), and finish with the step 6 report.

## Legacy email data contract (stock scaffolds)

What unmodified Lovable scaffolds write. The project's own files are authoritative where they differ — divergence is user customization. All four tables outlive the migration, and their live CHECK constraints reject any other strings; the Supabase client returns the rejection in its result instead of throwing.

- `email_send_log` (append-only) — `status` CHECK: `'pending'`, `'sent'`, `'suppressed'`, `'failed'`, `'bounced'`, `'complained'`, `'dlq'`. Stock writers: enqueue (auth hook, send surface) → `'pending'`; queue processor → `'sent'` (with `message_id`), `'failed'` (with `error_message`), `'dlq'`, and on classic stacks a `'rate_limited'` write on 429 that the CHECK rejects (stock no-op — neither reproduce nor port it); send-surface pre-send suppression hit → `'suppressed'`; suppression webhook → `'bounced'` / `'complained'` / `'suppressed'` with `template_name: 'system'` and a human-readable `error_message`. Auth rows use the action type as `template_name` (`signup`, `magiclink`, `recovery`, `invite`, `email_change`, `reauthentication`).
- `suppressed_emails` — `reason` CHECK: `'unsubscribe'`, `'bounce'`, `'complaint'` — never `'bounced'`. Stock writers upsert on `email` (lowercased), carrying the payload's `metadata`.
- `email_unsubscribe_tokens` — the unsubscribe route validates the token, stamps `used_at`, then upserts `suppressed_emails` with reason `'unsubscribe'`.
- `email_send_state` — single-row transport tuning; queue-internal, nothing to preserve.
