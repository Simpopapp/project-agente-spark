---
name: ad-campaign-review
description: Review the ad campaigns already running in connected ads accounts, covering account blockers, serving and review state, conversion tracking liveness, cost per result, and creative strength, answering in chat or as an explicitly requested HTML artifact. Triggers on review my campaign, how is my campaign doing or performing, is my ad working, are my ads getting results, check or audit my whole ads account, give my account a read-only health check, what should I look into or fix first, the recurring scheduled campaign review, create a campaign review report file, visual or interactive campaign report, downloadable campaign performance report, save this review in Files, and /skill:ad-campaign-review.
---

# Review live ad campaigns

Extends the ads campaign workflow with a provider-read-only campaign review. The review reads live evidence, attributes what is limiting results, and stops at ranked recommendations. An explicitly requested project document is the only allowed persistent side effect. Campaign management owns every provider change and its approval flow; the ads-operate contract owns operating conduct. Follow both. The same reads answer the account-wide baseline audit, so an ask to check the whole account and say what to investigate first belongs here too. This skill is not for creating or editing campaigns and not for billing or credits questions.

This skill requires a connected ads provider's read tools. If none are available, explain that a connected ads account is required and stop. Do not simulate account or campaign data.

## Choose depth and format separately

The question sets depth; a file request sets format. Neither follows from the other — a beginner can need the full diagnosis, a professional one line.

1. **Format:** Chat. Read `knowledge://skill/ad-campaign-review/references/interactive-report.md` only on an explicit ask for a file, download, visual or interactive report, or a review saved in Files. “Report” as a verb, “explain in more detail,” and follow-ups want an answer, not a file.
2. **Depth:** Open with a short plain-language briefing either way. Expand in chat, deeper provider reads included, when they ask for more, push back on a finding, or it cannot be justified briefly. Beginners get plainer words on the same evidence — never a thinner read, never a file as the price of detail.
3. **Register:** Match the vocabulary they brought. Gloss a term in plain words once, then use it. No advertising lessons.

## Route on the connected provider

1. Google Ads connected: read `knowledge://skill/ad-campaign-review/references/google-campaign-review.md` and follow it.
2. Meta connected: read `knowledge://skill/ad-campaign-review/references/meta-campaign-review.md` and follow it.
3. Several providers connected: run each provider's review and keep its evidence separate. Never imply one provider's review covers another, and never carry one provider's tools, field names, or conclusions into another's section.

## Scope the campaigns

1. Include every campaign the provider's reads return that served in the reporting window, whatever state it is in now — not only the ones enabled today. A campaign that spent and was then paused is often what explains the window's results, and leaving it out hides that spend while the account's own totals still carry it. Report its current state beside its numbers.
2. Include enabled campaigns that did not serve — blocked, rejected, learning, or returning zero results — since a campaign meant to be running and delivering nothing is itself a finding.
3. Leave out only campaigns that neither served in the window nor were meant to be running in it.
4. Deleted and removed campaigns are outside what these reads return on either provider, so their spend can sit in the account totals with no row to explain it. Where a read has given you an account-level total and it runs ahead of the campaigns you can list, say that the difference is not retrievable rather than attributing it to the campaigns you have or leaving it unremarked.

## Judge each campaign on its goal

The first line about a campaign answers whether it does what the user set it up to do. The goal is the one the campaign's brief under `ads/briefs/` records, read with the file tools rather than a shell command; without a brief, the provider's optimization setting says what the campaign buys. Lead with the metrics that match it and keep the rest as supporting evidence:

- **Awareness**: impressions and spend.
- **Web visits**: clicks and cost per click.
- **An action on the site** (a waitlist join, signup, lead, or purchase): that action's conversion count and cost per conversion.
- **Value**: conversion value and return on spend, with the conversion count beside them.

A campaign set up for visits has not failed for want of conversions, and one set up for purchases has not succeeded on impressions.

## Attribute before recommending

1. An account-level blocker outranks every campaign finding: nothing serves until it clears.
2. Not serving, rejected, or blocked: fix delivery first, following the reported reason. A rejection pointing at the destination means page or URL work, not an ads setting.
3. Clicks arriving with few or no conversions: establish tracking state and consent coverage before blaming the page. Follow `ads-tracking` and the provider's measurement knowledge when inspecting app code: check the chosen consent route, actual browser/backend outcome, values, and duplicate reporting. Expected consent-related gaps are not broken tracking; do not recommend weakening consent or adding unrequested matching/uploads to fill them. An active conversion action, or conversions in another campaign, does not prove this destination's tag fires — without destination-level evidence the cause stays unresolved. With tracking established, adequate volume, and poor conversion, the landing page is a possible bottleneck for the builder to investigate.
4. Healthy serving but few clicks: split on impressions. Few impressions warrant checking targeting, budget, and bid limits; plenty of impressions with a weak click-through rate warrant checking creative alongside audience and placement. These are investigation leads, not established causes.
5. High spend with no recorded conversions is spend to investigate, not proven waste or recoverable money. Conversion lag, learning state, and low volume stay unknown unless the reads establish them, and a fresh or learning campaign is never ranked against a mature one as directly comparable.
6. Never recommend raising, lowering, or reallocating a budget from observed performance alone. A budget recommendation needs the user's business target and value evidence, such as target cost per action or return on ad spend, margin, revenue, or lifetime value.
7. Show the result count beside a reported cost per result, naming the provider and result being counted. A handful of clicks or conversions supports a tentative lead, not a page-quality or creative-performance verdict; say when the volume is too low to judge. Zero recorded results means cost per result is unavailable, not zero.
8. Keep attribution bases separate: provider-attributed conversions are not verified orders or customers. Compare only the same goal, currency, attribution basis, and reporting scope; name unavailable attribution settings rather than assuming them. Treat recent conversion counts as potentially incomplete, not proof of deterioration.
9. An unresolved cause carries its next step: the one read or check that would settle it, and what either outcome would establish. Candidate-cause lists, and fixes over causes the evidence has not settled, are not answers.

## Diagnose deeper when a briefing cannot settle it

Extends the attribution rules, in chat and in a requested file alike, on the deeper evidence reads the provider's review file names. Those reads can answer on a narrower or differently attributed basis than the briefing — each provider's file names which of its own do that. Say the basis changed and re-read the earlier figure on it before the two are compared, totalled, or shown as one series; a figure that cannot be re-read keeps the basis it came from.

1. **Funnel:** impressions, destination clicks, landing-page arrivals, then the goal's results, from those reads. Include an intermediate event only where the reads return it and it belongs to that goal. Keep all-clicks apart from link clicks and unique visitors apart from event counts. A stage the reads do not carry stays unavailable rather than borrowed from another source or scope.
2. **Blended cost:** summed spend over summed matching results, never an average of per-campaign or per-ad ratios. Label the scope it covers rather than charging it to a subset. A missing denominator is unknown, a zero one makes the ratio unavailable, and counts sit beside every cost and rate so a thin sample stays visible.
3. **Bottleneck:** auction cost, click-through, arrival after the click, or conversion after arrival — whichever the reads support. Judge on the rate and its volume, not a raw event count. Separately attributed events are not one cohort, so their ratios are proxies rather than measured drop-off, and a stage the provider cannot measure goes undiagnosed.
4. **Period comparison:** only when asked — their windows where they name them, otherwise the immediately preceding equal-length one. Read both afresh at the same grain and basis; the current setting does not establish the historical one. Show the values behind a change, and name new delivery, no delivery, incomplete coverage, or lag instead of dividing by a zero or missing baseline. Say which rate moved cost per result, offsetting ones included.
5. **Creatives:** only where a finding warrants it or they asked. Identify each ad and its campaign with spend, the goal's results, and cost per result, and keep enabled ads with no delivery visible. Compare like-for-like campaign, goal, and attribution contexts, naming the audience, placement, or learning differences that spoil the verdict. A partial, failed, or unsupported ad-level read is unknown coverage, never zero: reconcile the rows against the campaign's spend before reading spend share, and where both periods are covered, separate a change inside the ads from a shift in spend between them. Short of that the cause is unresolved — not creative fatigue, not a reallocation.
6. **First-party evidence:** provider results stay labelled as attributed. Show the user's own source, dates, event definition, and coverage separately; a gap between the two is not over-crediting or a tracking failure without evidence. Uneven campaign matching breaks relative rankings as well as absolute costs, and an unavailable first-party source neither blocks the answer nor licenses an invented reconciliation.

## Complete a chat review

1. Check account blockers, delivery and review state, conversion-tracking liveness, spend against budget, cost per result, and creative strength before summarizing. Establish tracking state before interpreting conversions.
2. Lead with the most important finding and its spend, budget context, and the metrics that match its goal, or explicitly say which is unavailable. Name the provider's recorded result rather than calling it a verified sale. Add one compact health statement covering delivery, tracking, and creative evidence or their unknowns; group shared findings instead of repeating a checklist per campaign. Aim for a short briefing plus one or two next actions, not a campaign table, metric glossary, or full funnel breakdown. Brevity must not hide a blocker, failed read, or uncertainty that changes the recommendation.
3. Rank at most three concrete next actions with the why; give fewer when supported, and say no action is needed when that is what the evidence shows. The diagnostic step that would settle an unresolved cause counts as one of them, ahead of any fix that step could invalidate. Separate verified facts from inference. State the window once for numbers sharing it, and label any different window separately. Mention changes only when comparable periods were read; frame them as observations with confounders, never as test results.
4. Answer a follow-up in chat at the depth it asks for: the numbers behind the finding, further provider evidence where needed, and the diagnosis section above. Never meet it with a file offer, a restatement, or a thinner read for someone who sounds new to this.
5. Return prose only. Write no report file, emit no artifact, and make no provider or project mutation. End the turn after the review and, in an interactive chat, the recurring-review offer below; applying a fix starts from the user's reply and goes through the provider's normal tools and approval flow.

## Offer the recurring review

Skip this section entirely when this turn was started by a schedule (the wake-up message that runs this skill), when the run is headless, when the user asked for the artifact review (that reply stays the brief summary plus the artifact), or when this project has no wake-up schedule tools. One offer per reply: when a provider read in this reply already led you to offer, do not add a second.

1. List this project's wake-up schedules first and look for one named `ads-campaign-review`. If it exists, say so instead of offering: one the user paused is a standing opt-out, and one auto-paused (failing, out of credits) is reported truthfully with the option to resume.
2. Otherwise offer a weekly performance review after the findings, at the default cadence of Mondays at 09:00 in the user's timezone, and wait for the user's answer. When the `questions--ask_questions` tool is available, present it as a single-question card placed as the turn's last content, the cadence in the question and two options (yes at that cadence, no thanks); a skipped card is not a decline. A weekly review the user declined earlier in this conversation is that answer.
3. Only on a clear yes, register it under the exact name `ads-campaign-review` with the message `/skill:ad-campaign-review`, then name the cadence and that it can be changed or canceled anytime in chat.

## Complete an artifact review

Follow `interactive-report.md` after collecting the provider evidence, applying the same diagnosis rules the chat review uses. Keep every provider operation read-only; use `code--exec` only to create and verify the requested project document and, when the campaign files knowledge in context carries a collection step, to run that step so the report joins each covered campaign's Files collection. Return the brief summary and HTML artifact defined there instead of duplicating the report in chat.
