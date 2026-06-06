---
target: ticketbook-app
total_score: 26
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-06-06T04-56-13Z
slug: ticketbook-app
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No success moment after publishing a stub |
| 2 | Match Between System and Real World | 4 | "Stub" metaphor is clear, reinforced by design |
| 3 | User Control and Freedom | 3 | Dead edit route; progress bar not tappable |
| 4 | Consistency and Standards | 3 | Minor: 9px vs 10px label sizes across screens |
| 5 | Error Prevention | 3 | Good; autosave draft is excellent |
| 6 | Recognition Rather Than Recall | 2 | Features undiscoverable; no onboarding anywhere |
| 7 | Flexibility and Efficiency of Use | 2 | No feed search/filter; no quick-log path |
| 8 | Aesthetic and Minimalist Design | 3 | Clean; stats "coming soon" tab is noise |
| 9 | Error Recovery | 2 | Raw API error messages surface to users |
| 10 | Help and Documentation | 1 | Zero contextual help; one hint in the entire app |
| **Total** | | **26/40** | **Acceptable** |

## Anti-Patterns Verdict

Not AI slop. Fraunces + DM Mono pairing is distinctive; ticket stub metaphor is structural not decorative; warm near-black + amber isn't a first-order reflex for this domain. CLI detector unavailable (bundled not found). Manual review fallback used.

One finding: `console.log('draft :>> ', draft)` at `app/event/new.tsx:138`.

## Overall Impression

Strong design identity. Critical emotional miss: after 7-8 steps to log a show, the user gets a silent redirect to feed with no confirmation. Fix that and this feels substantially more polished.

## What's Working

1. Ticket stub card — notch corners, hero/body structure, VENUE/DATE/CITY layout. Genuine artifact feel.
2. Draft autosave — auto-persist + resume prompt is thoughtful for the actual use case (logging mid-crowd).
3. Typography system — Fraunces for display, DM Mono for metadata. Consistent and distinctive.

## Priority Issues

**[P1] No success state after publishing** — After 7-8 steps, router.replace to feed with no intermediate feedback. Core loop ends in silence. Peak-end rule: the last moment is what users remember. Fix: brief stub preview screen on publish.

**[P1] Dead edit route on event detail** — Pencil icon routes to /event/${id}/edit which doesn't exist. Every stub has a broken affordance. Fix: create the route or remove the icon.

**[P1] Stats tab is a dead end** — "Coming soon" in primary navigation erodes trust. Fix: remove the tab or populate with available user_stats data.

**[P2] No onboarding before auth** — "Your event archive" doesn't explain TicketBook to cold users. Fix: one pre-auth screen showing the stub format and the value proposition.

**[P2] No feed search or filter** — 100+ stubs means chronological scroll only. No search by artist/venue/year. Fix: search and filter on the "mine" feed tab.

## Persona Red Flags

**Casey (Distracted Mobile)**: No quick-publish path; 7-8 steps minimum. Silent redirect after publish.

**Jordan (First-Timer)**: Welcome screen doesn't explain the product. No scope indicator on step 1. Friend discovery requires knowing exact usernames — cold users have none.

**The Obsessive Archivist**: Stats tab is a dead end. No feed search for navigating 100+ stubs. Edit route is broken.

## Minor Observations

- Remove console.log at new.tsx:138
- Section labels inconsistent: 9px (event detail) vs 10px (event form)
- Progress bar hidden on step 1; users don't know scope before committing
- publishBtnDisabled uses C.surface2 background — nearly invisible on dark theme
- Missing empty state when search returns 0 users in explore screen
