# Google Ads campaign review

Overlap: SKILL.md owns the review contract, the attribution rules, and the report shape; this file owns the Google reads and the Google mechanics that instantiate them. Call only the read operations named in this file during the review, the deeper evidence reads included; use the shared interactive-report workflow for a requested project document instead of calling any other `google_ads` operation or mutation.

Account setup reads use `google_ads--setup_account` with no parameters; other reads use `google_ads--search` (GAQL); every account change goes through `google_ads--mutate`, except the dedicated tools named below (`upload_assets` for local image and video files, `import_campaign`, `create_campaign`).

## Read the evidence

1. Conversion measurement: `google_ads--search` on `conversion_action` (id, name, category, status, `primary_for_goal`). Report the primary measurement state before interpreting conversions. No action marked primary is a configuration gap, not absent tracking: secondary actions still record into All conversions, so report that no primary conversion action is configured rather than reading a zero primary count as weak performance. Do not call tracking broken unless the read establishes it; a new or untriggered tag can appear inactive, and unavailable health stays unknown.
2. `google_ads--setup_account` with no parameters. Report account blockers — billing and payment state, suspensions, verification — without inventing one.
3. Campaign state: `google_ads--search` on `campaign` (status, `campaign.primary_status` with its reasons, `campaign.bidding_strategy_type`) plus review verdicts from `ad_group_ad.policy_summary.approval_status` and `asset_group_asset.primary_status`. Record serving and review state for every campaign, including ones created directly in Google Ads. Report unmanaged campaigns' settings and spend as part of the account picture and mark them as not managed by Lovable; review any of them in depth — no import needed. Offer `google_ads--import_campaign` for a Performance Max, Search, or Demand Gen campaign the user wants Lovable to manage; importing is a mutation, never called during the review, and stays the user's call (see "When the user asks to apply a fix").
4. Goal: `campaign.bidding_strategy_type` says what the campaign buys. TARGET_SPEND (Google's maximize clicks) and MANUAL_CPC buy clicks; TARGET_IMPRESSION_SHARE, TARGET_CPM, FIXED_CPM, and MANUAL_CPM buy impressions; MAXIMIZE_CONVERSIONS and TARGET_CPA buy conversions; MAXIMIZE_CONVERSION_VALUE and TARGET_ROAS buy conversion value.
5. Performance: `google_ads--search` on `campaign` with `segments.date DURING` and the funnel metrics (money fields return micros; divide by 1000000 before reporting). State the reporting window and conversion goal, and compare only metrics sharing both. Campaign rows carry the funnel — impressions, clicks, CTR, conversions, conversions per click — plus value and spend. One read covers one window; comparing periods means one `google_ads--search` call per window filtered `segments.date BETWEEN`, and any difference reported is observational, not a controlled test.

## Deeper evidence reads

These extend the performance read whenever the answer needs more than the briefing establishes, in chat and in a requested HTML report alike; the skill's diagnosis section owns the analysis.

1. Read `customer.currency_code` and `customer.time_zone` through `google_ads--search` before resolving report dates. Select `metrics.cost_micros`, `metrics.impressions`, `metrics.clicks`, `metrics.ctr`, `metrics.conversions`, and `metrics.conversions_value` from `campaign` for the exact window, with campaign identity and budget context. Google clicks are not a separate landing-page-arrival count; report that stage as unavailable from these reads.
2. Read conversion definitions through `google_ads--search` on `conversion_action`, including category, counting type, click-through and view-through lookback windows, and `attribution_model_settings.attribution_model`. Where the campaign counts different actions, use a separate performance query segmented by `segments.conversion_action` to identify the conversion mix. Keep unsegmented spend separate: do not charge a campaign's whole spend to each action as if each were its own cost per result.
3. For a warranted creative drill-down, use `google_ads--search` on `ad_group_ad` with campaign and ad identity, status, and supported performance metrics; for Performance Max use `asset_group` metrics and `asset_group.ad_strength`. An asset group's results belong to the group, not an individual image or headline. Ad strength is Google's assessment, not proof of conversion performance; unavailable ad-level attribution stays unknown. Reconcile the rows' cost against the campaign's spend before reading spend share: some campaign types return no ad-level rows and Google omits metrics it will not attribute at that grain, so a shortfall means the drill-down misses the campaign — report the gap, leave spend share open, and do not rank what came back.
4. Read the account-wide daily series through `google_ads--search` on `customer`, selecting `segments.date`, `metrics.cost_micros`, `metrics.impressions`, and `metrics.clicks` for the report window. This is the account chart's source, not a per-campaign series.

## Google specifics for the attribution rules

* A destination-policy rejection is the "rejection pointing at the destination" case: the landing page URL is broken or mismatched, so it is page or URL work, not an ads setting.
* `segments.conversion_action` narrows the basis: each row counts one action against the campaign row's every conversion. They need not sum, and neither restates the other.
* `google_ads--search` also covers a named drill-down the reads above cannot answer. Treat search-term results as a partial sample: return candidates for the user to review, never a ready-to-apply negative-keyword list.
* Distinguish website actions from uploaded outcomes and primary conversions from All conversions. Tag Assistant and Google Ads diagnostics can verify signals and receipt when available; action settings alone cannot prove the app's consent wiring or enhanced-conversion eligibility. Consent Mode modeling is conditional, not a promise to recover every denied conversion; successful uploads are not proof of attribution.

## Return the evidence

Follow the response mode selected in `SKILL.md`. An artifact request permits the final project-document write and no Google Ads mutation.

## When the user asks to apply a fix

Changes go through the registered `google_ads` tools and their approval flow, one change at a time, letting each settle before the next. Constraints that destroy live state when ignored:

* Upload replacement files with `upload_assets`, then attach their ready references through `mutate`. Repeat `upload_assets` with the same video path to refresh processing status or resume a transfer. New uploads and mutations have approval cards. PMax replaces asset-group links in one batch; Demand Gen replaces the changed image slots with complete asset-reference lists and masks for those slots.
* `import_campaign` accepts Performance Max, Search, and Demand Gen campaigns. Its approval card precedes saving campaign documents, available source media, and managed-campaign membership. Call it only when the user asks to import, outside the review sequence.
* Through `mutate`, targeting criteria (locations, languages, negative keywords) are create/remove resources: read the live criteria with `search` first and change only the difference, never rebuild the full set.
* On search ads, ad text is a complete replacement: an adOperation update through `mutate` replaces the responsive search ad's full headline and description sets, so read the live ad first and send every surviving line. Keywords are individual criterion resources: change them one criterion at a time.
* Prefer pausing a keyword over removing it; removal loses Google's review state.
