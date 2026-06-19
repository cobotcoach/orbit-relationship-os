# ORBIT Reset — Cobot Coach only

Ruthless removal + cockpit redesign + Ask ORBIT AI team member. No new features beyond brief.

## 1. Delete routes & nav entries
Delete files:
- `src/routes/operations.tsx`
- `src/routes/pipeline.tsx`
- `src/routes/import.tsx`
- `src/routes/cobot-coach.tsx`
- `src/routes/inbox.tsx`

Strip their links from `SideNav.tsx`, `BottomNav.tsx`, and any cross-links in `index.tsx`, `mission.tsx`, etc. Regenerate `routeTree.gen.ts` by removing entries (Vite plugin will rewrite on dev).

## 2. Types & modes
In `src/lib/types.ts`:
- `IDEA_MODES` → `cobot_coach`, `wild` only
- Remove `Quote`, `AppEvent`, `LoanEquipment`, `SupportTicket` interfaces
- `CONTACT_TYPES` → `partner`, `prospect`, `ecosystem`
- `FOLDERS_BY_TYPE` → partner: approached/interested/committed/live; prospect: warm/cold; ecosystem: default

In `src/lib/mode-context.tsx`: default mode = `cobot_coach` (not null). Switcher = 2-state toggle (Cobot Coach amber / Wild purple).

Supabase tables stay untouched (data preserved). `db.ts` methods for quotes/loans/etc. can stay as dead code or be removed if unreferenced.

## 3. Navigation
**SideNav** (desktop, 6): Mission Control `/mission`, Today's Actions `/focus`, Ideas `/ideas`, Partners `/contacts`, Intel `/intel`, Capture Log `/log`.

**BottomNav** (mobile, 5): Mission, Actions, **Capture** (centre elevated), Ideas, More (drawer → Partners, Intel, Log, Upload).

## 4. Home → Mission redirect
Rewrite `src/routes/index.tsx` to `<Navigate to="/mission" replace />` (or loader redirect).

## 5. Mission Control cockpit (`/mission`)
Rewrite layout:
- **Sticky top strip**: `🟠 COBOT COACH · 43 days to launch · [Ask ORBIT ▸]` (days calculated from a constant launch date, e.g. `2026-07-31`).
- **Today (max 3)**: top urgent action, top weekly commitment, top blocker. Each: title + one button (Done | Fix it).
- **Business Sections**: 4 clusters of the 12 cards, compact (emoji/title/confidence bar/next action/status dot), expand on tap, blocked = red left border + float top of cluster.
- **This Week**: weekly commitments checklist with "What will you ship this week?" input pinned bottom.
- **Recent Captures**: collapsed, last 5 from capture log, "View all" → /log.

Cluster grouping for the 12 sections — I'll group by existing section keys into 4 buckets (Product/Build, Go-to-market, Operations, Foundations) based on what's in the table; will introspect existing data shape first.

## 6. Ask ORBIT — full-screen AI chat panel
Triggered from top strip button. Slide-over (right on desktop, full-screen bottom-up on mobile).

**Conversation shape**: one ongoing conversation per user (not threaded) — matches "Each session loads last 10 messages." Storage: existing `mission_chats` Supabase table.

**Server route**: new `src/routes/api/ask-orbit.ts` — TanStack server route using AI SDK `streamText` with Lovable AI Gateway (model `google/gemini-3-flash-preview` by default; can swap). Injects context (all 12 sections, open actions, weekly commitments, days-to-launch) into system prompt per request. Persists user + assistant messages to `mission_chats` in `onFinish`.

**Client**: AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`) installed via `bun x ai-elements@latest add ...`. `useChat` with `DefaultChatTransport` pointed at `/api/ask-orbit`. Loads last 10 messages from `mission_chats` on mount via server fn. Renders `message.parts`.

**Quick-action chips** above input: 5 chips that call `sendMessage({ text })` directly.

**Knows strip** at top of panel showing live counts.

No tool-calling in v1 — the "Log this decision?" / "Mark this done?" prompts are model-generated text Richard acts on manually (brief doesn't require auto-execute). I'll note this explicitly; if you want actual tool execution, that's a follow-up.

## 7. Today's Actions (`/focus`)
- Desktop: 3 columns NOW / THIS WEEK / LATER by urgency.
- Mobile: single list, urgency colour left border.
- Top input: type + enter = add as medium.
- Each row: title, dot, due, Done. Tap to expand for description/contact/delete.
- Empty: "Nothing urgent. Go build something." → /mission.

## 8. Partners (`/contacts`)
- Tabs: Partners / Prospects / Ecosystem (default Partners).
- Partners grouped by stage (approached → interested → committed → live).
- Card: name, company, stage badge, last contact, "Follow up" button (creates action).
- Nav label "Partners", route stays `/contacts`.

## 9. Intel (`/intel`)
- Full-width newest-first feed.
- Source badge, 120-char summary, urgency dot, timestamp. Tap expands.
- Filter: All / Plaud / Manual.
- "Add Intel" → textarea modal, source=manual.

## 10. Design tokens & mobile
Rewrite `src/styles.css` with exact hex tokens from brief (amber primary `#f59e0b`, teal success `#10d9a0`, dark surfaces). Replace existing oklch-based palette.

Mobile rules: 48px min tap targets, 16px input font-size, bottom nav `env(safe-area-inset-bottom) + 8px`, capture button 64px, no horizontal scroll, full-width cards.

## Open question

**Days-to-launch counter**: I'll hardcode launch date `2026-07-31` (end of July 2026) unless you have a specific date. Today is 19 June 2026 → ~42 days. Fine?

## Files touched (estimate)
- **Delete**: 5 route files
- **Rewrite**: `index.tsx`, `mission.tsx`, `focus.tsx`, `contacts.index.tsx`, `intel.tsx`, `SideNav.tsx`, `BottomNav.tsx`, `styles.css`, `types.ts`, `mode-context.tsx`
- **New**: `src/routes/api/ask-orbit.ts`, `src/components/AskOrbitPanel.tsx`, `src/lib/ask-orbit.functions.ts` (load history, list sections context), AI Elements components under `src/components/ai-elements/`
- **Edit**: `db.ts` (add mission_chats methods if missing), `ui-bits.tsx` (token colours)

Estimated ~20 file changes, one Supabase read of `mission_chats` schema to confirm column names, no new tables, no migrations.

Approve and I'll execute end-to-end.