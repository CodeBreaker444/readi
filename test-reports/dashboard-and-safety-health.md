# ReADI — QA Test Report: Dashboard & Safety Health Index

**Scope:** `/dashboard` (Main Dashboard) and `/dashboard/safety-health` (Safety Health Index)
**Report status:** Draft — hybrid (code-verified structure + user-observed live values). Cells marked `TBD` need a tester to confirm against a live session.
**Prepared:** 2026-08-12
**Source files reviewed:** `src/components/dashboard/DashboardClient.tsx`, `SHIIndex.tsx`, `SafetyHealthGauge.tsx`, `SHITrendChart.tsx`, `AreaGauges.tsx`, `IndicatorCards.tsx`, `IndicatorTrendChart.tsx`, `src/components/ai/AiUsageWidget.tsx`

> Note: Both pages are **read-only reporting views** (no data-entry forms) — they display data aggregated from missions, pilots, and SPI/KPI logs entered elsewhere in the app. So instead of "data entered → outcome," each row below is "data point displayed → what it should show / does show."

---

## 1. Main Dashboard (`/dashboard`)

### 1.1 Access & load

| Test | Data / Condition | Expected Outcome | Observed | Status |
|---|---|---|---|---|
| Page load | Navigate to `/dashboard` as a logged-in user | Skeleton loader shown while `POST /api/dashboard/{ownerId}` resolves, then all widgets populate | TBD | ☐ |
| Role gating | Login as non-admin role (e.g. PIC, Viewer) | AI Usage Widget section is **hidden** (only rendered for `userProfileCode === 'ADMIN' \| 'SUPERADMIN'`) | TBD | ☐ |
| Role gating | Login as ADMIN or SUPERADMIN | AI Usage Widget **is visible** below the charts row | TBD | ☐ |
| API failure | Simulate `/api/dashboard/{ownerId}` error | Console logs error; page does not populate widgets (no user-facing error banner currently) — worth flagging as a gap | TBD | ☐ |

### 1.2 KPI stat cards (top row — 5 cards)

| Card | Source field | Expected behavior | Observed value | Status |
|---|---|---|---|---|
| Total Missions | `readi_mission_total.total_mission` | Integer count, footer shows current year | TBD | ☐ |
| Logged Drones | `readi_mission_total.total_drones_used` | Integer count of distinct drones used | TBD | ☐ |
| Hours Flown | `pilot_total.total_hours` (fallback `readi_mission_total.total_hours`) | Numeric hours | TBD | ☐ |
| Km Flown | `pilot_total.total_distance` or `readi_mission_total.total_meter` ÷ 1000, rounded | Integer km | TBD | ☐ |
| Customers Served | `readi_mission_total.total_clients_served` | Integer count | TBD | ☐ |
| Zero-data case | New/empty company with no missions | All 5 cards render `0`, not blank/NaN (defensive `|| '0'` fallback exists) | TBD | ☐ |

### 1.3 Mission Overview — bar chart

| Test | Data | Expected Outcome | Observed | Status |
|---|---|---|---|---|
| Chart renders | `readi_mission_chart.labels` (months) × `series` (per-drone data) | One bar series per drone, one color each (10 curated colors, then generated hues for >10 drones), grouped by month on X-axis | TBD | ☐ |
| Legend | Multiple drones in same period | Legend lists every drone name; tooltip on hover shows per-drone value for that month | TBD | ☐ |
| Empty state | No missions in period | Chart renders with no bars (no explicit empty-state message — gap to note) | TBD | ☐ |

### 1.4 Mission Results — pie chart

| Test | Data | Expected Outcome | Observed | Status |
|---|---|---|---|---|
| Chart renders | `readi_mission_result_chart` (Completed / In Progress / Failed) | Donut chart, 3 segments; colors: red `#ef4444`, green `#10b981`, amber `#f59e0b` (index order 0/1/2) | TBD | ☐ |
| Legend rows | Same data | Each legend row shows label, raw value, and a % progress bar computed as `value / sum(all values)` | TBD | ☐ |
| Fallback | No `readi_mission_result_chart` in API response | Falls back to demo split `65% / 25% / 10%` — **this is a fallback that could mask a real "no data" state**, worth confirming intended | TBD | ☐ |

### 1.5 AI Usage Widget (admin/superadmin only)

This is the "chatbot usage limit" section referenced.

**If logged in as SUPERADMIN** (`scope: 'platform'`):

| Field | Meaning | Observed | Status |
|---|---|---|---|
| Today's usage | `used / limit` tokens, progress bar (Groq free tier) | TBD | ☐ |
| Amber warning | Shown when `today.percent >= 80`; text = "Limit reached" if 0 remaining, else "`N` tokens remaining" | TBD | ☐ |
| All-time | Cumulative platform token usage | TBD | ☐ |
| Companies | Count of distinct companies with usage today | TBD | ☐ |
| Remaining | `today.remaining`, turns red text if `0` | TBD | ☐ |

**If logged in as ADMIN** (`scope: 'company'`):

| Field | Meaning | Observed | Status |
|---|---|---|---|
| Platform usage bar | Company's view of the shared platform ceiling (`platformUsed / platformLimit`) | TBD | ☐ |
| Platform-nearing-limit warning | Shown when `platformPercent >= 80` | TBD | ☐ |
| Company today | Tokens used by this company today | TBD | ☐ |
| All-time | Company's cumulative usage | TBD | ☐ |
| Active users | Distinct users who used the assistant today | TBD | ☐ |
| Top users list | Top 3 users by token count today, each with own progress bar vs. `perUserLimit`; bar turns amber/red at ≥80% of per-user limit | TBD | ☐ |

Test cases to run explicitly:
- [ ] Use the chatbot enough to cross 80% of the daily limit → confirm amber warning + icon appears.
- [ ] Use the chatbot until limit is reached (if feasible in a test env) → confirm "Limit reached" text and red remaining count.
- [ ] Confirm the widget **never renders** for a non-admin role (test as PIC/Viewer).

### 1.6 Past Missions / Next Missions tables

| Test | Data entered/action | Expected Outcome | Observed | Status |
|---|---|---|---|---|
| Past table populates | Missions with `date` in the past (`readi_mission_scheduler_executed`) | Rows show ID (`#missionId`), Pilot name (or "Not assigned" placeholder), Date, Status badge | TBD | ☐ |
| Next table populates | Upcoming missions (`readi_mission_scheduler_planned`) | Same columns, future dates | TBD | ☐ |
| Status badge colors | Status codes `00/05/10/99/101` | 00 Scheduled = blue, 05 In Progress = amber, 10 Completed = emerald, 99 Cancelled = red, 101 Pending = slate; unknown code falls back to slate | TBD | ☐ |
| Status reflects live changes | Admin changes a mission's status on the Operation Board after it was scheduled (e.g. reassign, cancel, complete) | Dashboard table reflects the **current** status, not the status at scheduling time — this is explicitly the intended source of truth per code comment | TBD | ☐ |
| Search | Type a pilot name or mission id into the search box | Table filters to matching rows only (global filter) | TBD | ☐ |
| Status filter dropdown | Select a specific status from the dropdown | Table shows only rows with that `statusLabel`; dropdown options are derived dynamically from data present (not a fixed list) | TBD | ☐ |
| Pagination | Table with >8 rows | Paginates at 8 rows/page; pagination controls appear only when rows exist | TBD | ☐ |
| Empty state | No past missions / no next missions | Table shows localized empty message instead of blank table | TBD | ☐ |

---

## 2. Safety Health Index (`/dashboard/safety-health`)

Backed by `POST /api/dashboard/getSPIKPIData`, `getSHITrend`, `getSPIKPITrend`. EASA safety-model badge shown in header.

### 2.1 Overall Safety Health Gauge

| Field | Rule | Observed (2026-08-12 live check) | Status |
|---|---|---|---|
| Score value | `safety_index` from `getSPIKPIData`, shown to 1 decimal, e.g. `100.0%` | 100.0% | ☑ Verified live |
| Status label/color | ≥85 = **Excellent** (green), 70–84 = **Marginal** (amber), <70 = **Unsatisfactory** (red) | Excellent (consistent with 100.0% score) | ☑ |
| Legend ranges | Static legend: Excellent / Marginal / Unsatisfactory bands | TBD (confirm exact range text shown, e.g. "85–100") | ☐ |
| Gauge widget renders | JustGage/Raphael loaded from CDN | TBD — confirm no console errors if CDN blocked (no offline fallback exists) | ☐ |

### 2.2 Monthly SHI Trend chart

| KPI | Meaning | Observed (live) | Status |
|---|---|---|---|
| Status badge | Same Excellent/Marginal/Unsatisfactory thresholds, based on latest value | Excellent | ☑ |
| Current | Latest value in trend series | 100.0% | ☑ |
| Average | Mean of all values in trend series | 87.1% | ☑ |
| Peak | Max value in trend series | 100.0% | ☑ |
| vs Prev | `latest − previous` value, green if ≥0 else red | +14.3% | ☑ |
| Zone legend | Excellent (green) / Marginal (amber) / Unsatisfactory (red) shading bands on chart (70/85 thresholds) | TBD — visually confirm shaded bands align with 0–70 / 70–85 / 85–100 | ☐ |
| Chart tooltip | Hover a data point | Shows month + value to 1 decimal with `%` | TBD | ☐ |
| Consistency check | Current (100.0%) matches Overall Gauge score (100.0%) | **Consistent** — both reflect same underlying `safety_index`/latest trend point | ☑ |

### 2.3 Safety Score by Area (Area Gauges)

Each area's score = `(GREEN indicators × 1 + YELLOW × 0.5) / total indicators × 100`, rounded to 1 decimal. Sector coloring: red 0–69, amber 70–84, green 85–100.

| Test | Observed | Status |
|---|---|---|
| Area score displayed | User-reported: **100%** for the area(s) checked | ☑ Verified live (value consistent with all indicators in that area being GREEN) |
| Area score matches indicator mix | Cross-check: an area at 100% requires **every** indicator in that area to be GREEN — if any indicator is YELLOW/RED, area score must be <100% | TBD — spot-check by comparing an area's gauge % against its Indicator Cards below it |
| Multiple areas | Company has >1 defined safety area | Each area gets its own gauge card in a responsive grid (2/3/4 columns) with indicator count label | TBD | ☐ |
| Legend | Good (green) / Mid (amber) / Bad (red) legend shown in header | TBD | ☐ |
| Zero-indicator area | An area exists with 0 indicators defined | `computeAreaIndex` returns `0` — confirm this doesn't misleadingly show as "red/bad" for an area that's simply unconfigured | ☐ |

### 2.4 Indicator Cards (per-area detail)

One card per SPI/KPI indicator: name, GREEN/YELLOW/RED status badge, gauge (0 → 1.5× target), Value, Target, and progress bar (`value/target`, capped at 100%).

| Test | Observed (from screenshot, area unspecified — likely "Operations") | Status |
|---|---|---|
| Example indicator: Value | 77.4 (unit unclear — % or count) | ☑ recorded, TBD confirm unit + exact indicator name |
| Example indicator: Target | 2 (same unit) | ☑ recorded |
| Progress bar | `value/target` capped at 100% → since 77.4 ≫ 2, bar should show **100%**, not the raw ratio | TBD — confirm bar reads 100%, not >100% or a broken value |
| Status badge color | Given value far exceeds target, status should be GREEN ("Good") if threshold logic treats "at/above target" as good — **but confirm this indicator isn't inverted** (some safety indicators are "lower is better," e.g. incident counts, where 77.4 vs target 2 would actually be a RED/critical breach, not a pass) | ☐ **Flag for manual review** — see note below |
| Multiple indicators per area | Area with several indicators | Cards render in a responsive grid (1/2/4 columns) grouped under an area-name divider | TBD | ☐ |

> ⚠️ **Needs verification, not assumed:** the pasted values (`Operations`, `Value 77.4`, `Target 2`) look like they could describe an indicator where higher-is-worse (e.g., an incident/occurrence-rate KPI) rather than higher-is-better. The component itself doesn't encode direction — status (`GREEN/YELLOW/RED`) and the "on target" classification are computed server-side per indicator definition (`spi_kpi_definition` in Prisma). Confirm with whoever owns SPI/KPI configuration that this indicator's direction is set correctly, since a misconfigured direction would show a critical safety indicator as "Excellent."

### 2.5 Indicator Trend (Trend Analysis section)

Indicator selector (alphabetically sorted dropdown of all indicator names) + trend chart for the selected one.

| KPI | Meaning | Observed (live) | Status |
|---|---|---|---|
| Status badge | ≥90% of target = **On Target** (green), 60–89% = Marginal (amber), <60% = Below Target (red) | On Target | ☑ |
| Latest | Most recent logged value for selected indicator | 77.40 | ☑ |
| Target | Configured target for selected indicator | 2.00 | ☑ |
| vs Prev | `latest − previous`, green if ≥0 | +0.00 | ☑ (flat — only one data point logged yet, or no change since last period) |
| Progress % | `min(100, latest/target × 100)` | Should read 100% (since 77.40 ≫ 2.00) — TBD confirm displayed % | ☐ |
| Selector switching | Choose a different indicator from dropdown | Chart, KPI row, and status badge update to that indicator's own trend/target data | TBD | ☐ |
| No-data state | Newly created indicator with no logged measurements yet | Component shows "Select an indicator to view" placeholder only when nothing is selected — confirm behavior when selected but genuinely empty (`values: []`) since `latest`/`prev` would default to `0` | ☐ |
| vs Prev = 0 edge case | Only one measurement ever logged | `prev` defaults to `latest` when there's no second data point, so delta always shows `+0.00` — **this could misleadingly read as "no change" rather than "insufficient history"** | ☐ Flag as UX gap |

---

## 3. Cross-page consistency checks

| Check | Expected | Status |
|---|---|---|
| Overall gauge (100.0%) = SHI Trend "Current" (100.0%) | Both derive from the same latest safety index value | ☑ Confirmed consistent from provided values |
| An area shown at 100% has no RED/YELLOW indicator cards underneath it | TBD — needs a live screenshot of the Indicator Cards for that same area to cross-check | ☐ |
| SHI Trend "Peak" (100.0%) never exceeds Overall Gauge's all-time max | Sanity check only if historical peak data available | ☐ |

---

## 4. Summary of open items

1. **TBD (needs live click-through):** most interaction tests — search/filter/pagination on mission tables, AI usage warning thresholds, chart tooltips, empty states, role-gating (admin vs non-admin view).
2. **Flag for review:** Indicator direction (higher-is-better vs lower-is-better) for the "Operations" indicator with Value 77.4 / Target 2 — confirm GREEN status is actually correct and not a misconfigured indicator masking a real issue.
3. **Flag as UX gap:** "vs Prev = +0.00" is indistinguishable between "no change" and "only one data point exists" — consider before relying on this for trend read.
4. **Flag as UX gap:** Mission Results pie chart falls back to a hardcoded demo 65/25/10 split when the API returns no `readi_mission_result_chart` — could hide a genuine "no missions yet" state.
5. **No dashboard-level API error UI** — a failed `/api/dashboard/{ownerId}` call only logs to console; user sees stale/empty widgets with no message.

---

*Next report sections (Operations/Mission creation + import, Auth/MFA, Team, Fleet, Compliance, etc.) to follow as separate files once live test credentials/session are available to complete the TBD items above.*
