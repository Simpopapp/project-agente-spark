---
name: seo-review
description: Run an on-page SEO review on the current project and surface its results. Triggers when the user explicitly wants to assess, audit, diagnose, or improve their own project's on-page SEO, or find what's wrong or what to fix on it — e.g. "/seo-review", "check my SEO", "SEO audit", "what's broken on my site". Do not trigger on questions solely about current Google indexing, rankings, visibility, or organic traffic; third-party SEO tooling; registrar/DNS issues; general SEO concepts; paid ads; social media; or retaining existing users.
---

# SEO Review

Start a fast foundations review on the current project and keep its results in chat. The SEO tab runs the full review, including the slower metadata and content analyses.

Use the review for explicit audit, diagnosis, improvement, and fix requests. It is a technical
diagnostic, not an acquisition strategy; general acquisition questions follow
the other loaded guidance instead. Existing SEO findings can support that
guidance, but do not make a new review its prerequisite.

The scan checks on-page hygiene; it cannot report current rankings, indexing, or organic traffic. Other loaded guidance owns those questions and may offer this review after reporting live evidence.

## Steps

Use these steps when the user explicitly asks for an SEO review, audit, check, diagnosis, or improvement, or accepts an offer to run one.

1. Call `seo--list_findings` to read any existing findings. Treat a scanner's findings as current only when `status` is `current`. Stale, running, failed, unknown, or `not_scanned` scanner state is incomplete evidence; do not present it as a diagnosis of the current project.

2. Call `seo--trigger_scan` even when step 1 returned no findings. Do not diagnose on-page issues from project code or claim the review started until the tool returns success. Follow the tool's approval behavior for the current flow.

3. Read the completed results with `seo--list_findings`, passing `scanner_names: ["lint", "http", "metadata_basics"]` and failing and passing states. Wait only for those checks. If they are still running or unavailable, say so without presenting stale results.

4. Follow the scan tool's presentation instructions. When it requests `seo--present_findings`, show every returned finding in that card. Otherwise summarize the results in chat and ask before fixing. Carry out already-approved fixes without asking again. Do not redirect the user to the SEO tab to see this scan's results.
