# Interactive campaign review report

Extends the campaign review with an on-demand project document. For this report only, the naming, versioning, and verification rules below are the complete contract and replace the general `documents-artifacts` guidance: Files collection metadata is skipped except the campaign collection step in item 4 below, versions carry the `-v2` form named below, and the functional read-back stands in for screenshot inspection. That holds even though writing to `/mnt/documents` re-attaches the general guidance mid-turn, and it changes nothing for any other file the same turn produces — a deliverable outside this report follows `documents-artifacts` in full.

## Handle missing provider evidence

1. **No evidence:** Explain unavailable provider access in chat and create no file when no supported provider returns campaign evidence.
2. **Partial evidence:** Create the report from successful providers and add a named unavailable section for every failed or unsupported connected provider.

## Establish the evidence

1. Use the reporting window the user requested. Otherwise use the last 30 complete days, ending on the day before today.
2. Resolve those days as the ad account's own local calendar days — every provider dates its reporting rows in the account's time zone, so a UTC window can pull a partial local day while claiming a complete one. Read that time zone through the provider's review file, label the window with it, and keep the generation timestamp in UTC.
3. Reuse only an immediately preceding complete review in the same conversation whose exact window and provider coverage are explicit and match this request. Otherwise refresh each provider through its read workflow.
4. Keep currencies and conversion goals within their provider and campaign context. Never total or compare incompatible values.

## Author the report

The skill's diagnosis section supplies the analysis; this file places it. Derive every cost, rate, total, and delta inside the generation command from the read counts, never from a figure carried over in prose.

Create one self-contained HTML document in the requester's conversation language. Lead with a short diagnosis and the campaign overview, each campaign's row opening on the metrics that match its goal; put the funnel, requested comparisons, and relevant creative breakdowns in expandable detail, showing before and after values with their relative change wherever a comparison was asked for. There is no fixed column set or mandatory panel for every metric: show the evidence that explains this account's results.

Style it by `knowledge://skill/ad-campaign-review/references/report-house-style.md` unless the user asks for something else. That file replaces `documents-artifacts`' instruction to match the project's brand cues, which fits a surface of the app the project builds rather than a document about an ad account read beside the provider's own dashboards.

Give a value visual emphasis only where the evidence carries it: a status color belongs on a judgment the reads establish, never on one they left unknown.

It must carry: the reporting window with its time zone, a UTC generation timestamp, and the providers read; every included campaign with its delivery and review state, conversion-tracking liveness, spend, budget context, provider currency, cost per result, and creative-strength evidence; an explicit unknown wherever the evidence does not establish a value; verified provider reads told apart from agent inference; and a judgment per campaign with a one-sentence evidence-based rationale. Provider and campaign filtering and column sorting are interactive, in inline JavaScript.

Rank fixes when the evidence supports them, ordered by expected impact, and leave the section out entirely when it does not — an account with nothing worth changing reads better without a padded list.

Two guards on how it reads:

1. **Do not explain the report to its reader.** No legend, no "how to read this", no scope note, no footer restating that the review was read-only or which provider it came from — the header already says that. Assume a competent reader.
2. **Detail is disclosed, not crowded into the overview.** Put rationale, metric definitions, attribution settings or their absence, and supporting funnel or creative tables inside expandable sections. Keep result counts beside their costs and evidence limitations beside the conclusions they qualify; do not hide a material caveat in a footer.

Do not show creative images, raw provider payloads, unnecessary identifiers, mutation controls, or a default previous-period comparison. Do not recommend a budget change without the business targets and value evidence the provider review contract requires.

## Chart the trend when there is one

When the window carries non-zero impressions or clicks, put one daily trend chart directly below the campaign table, plotting spend and one delivery metric.

1. **No delivery, no chart.** No impressions and no clicks means no chart at all — not an empty axis or a flat zero line.
2. **Read the series fresh, at account level, and say so.** Obtain a daily-segmented read scoped to the whole account — one row per date — through the call the provider's review file names for it. A daily read broken out per campaign instead multiplies the rows and silently truncates once it overruns the provider's row or page limit, so a window past that limit needs consecutive calls. A dated series is never carried over from an earlier review that did not fetch one.
3. **Label the chart as account-wide.** It totals the whole account, so it also counts whatever the rows above it miss — a truncated read, or a campaign the provider did not return. Name it as account-wide in the chart's caption, and say so wherever its spend does not match the rows. Never read a campaign-level conclusion or a ranked fix out of it — those come from the table's campaigns.
4. **A missing date is a zero; a result at exactly the provider's row limit is truncated.** Plot the gaps as zero — weekends and mid-window launches look like that. Re-read a truncated result over shorter ranges, and drop the chart if it still cannot be completed, since a truncated series reads as a collapse in delivery.
5. **Draw it inline, and label it.** Build the SVG with `createElementNS`; `createElement` yields an element that renders nothing. No charting library or external request. Label both axes, state the trend the chart shows in one sentence beside it so a reader who cannot resolve the plot still gets the finding, and keep the chart inside the reporting window — no previous period, trendline, or forecast.

## Keep the HTML inert

1. Put all report data, styles, and interaction code in the HTML file. Use no external scripts, stylesheets, fonts, images, sibling files, live provider calls, or network requests.
2. HTML-escape every provider-derived and user-derived value inserted into markup or attributes.
3. Serialize embedded data so `<`, `>`, `&`, U+2028, and U+2029 cannot break out of its script context.
4. Render dynamic values with `textContent` or DOM node creation, never `innerHTML`, `insertAdjacentHTML`, `document.write`, or string-built event handlers.
5. Include no credentials, signed URLs, secrets, or executable provider access.

## Write and present the artifact

1. Use `code--exec` to create `/mnt/documents/ads/reports` and write the complete HTML with exclusive-create semantics, passing the whole document in that one command so the written markup is auditable from the call itself. Name the first report from the UTC date as `Campaign report YYYY-MM-DD.html`; on collision choose `Campaign report YYYY-MM-DD-v2.html`, then `-v3`, without overwriting or revising an existing file. Remove an incomplete new file if the write fails.
2. Use `code--exec` to read back the created file and verify it is non-empty, self-contained, contains the requested controls and campaign rows, and has no external dependencies or live calls. Check derived costs, rates, totals, and any requested deltas against the read counts, including zero or missing denominators. Visual rendering and screenshot inspection are not required for this report.
3. Return a brief chat summary focused on the most important result. Do not duplicate the full report in chat.
4. Append exactly one `<presentation-artifact path="ads/reports/<created-filename>" mime_type="text/html"></presentation-artifact>` tag, where `<created-filename>` is the name written in step 1 including its `.html` extension. Create no other Files collection metadata; when the campaign files knowledge in context carries a collection step, follow it so the report joins the collection of each campaign it covers. Without that step, run no collection command.
5. If HTML generation or verification fails, remove the file just written so no unverified report stays readable or holds the day's name, then return the brief evidence summary, disclose that the artifact failed, and emit no artifact tag or invented path.
