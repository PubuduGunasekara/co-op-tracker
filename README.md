# Co-op Tracker

A polished, **static, offline-first** single-page app for managing software-engineering
co-op / internship applications. No backend, no database, no login — your data lives in
your browser's `localStorage`, with JSON **Export/Import** for backups and portability.

Built with **React + Vite + Tailwind CSS**.

## Features

- **Board** (home screen) — a full-height **drag-and-drop Kanban**. Cards show the dates that
  matter (OA / phone / onsite, deadlines until you apply) as colour-coded chips that get louder
  as they get close, plus how long an application has been waiting. Per-card **Move** menu
  (keyboard/touch friendly), **Undo** after a move, collapsible columns, quick-add, and a
  "Smart" ordering per column. Moving a card to Rejected fills in the rejection date and stage.
- **List / Companies** — the same applications as an inline-editable, sortable table (with OA and
  rejection-date columns) or grouped by company. Search, quick presets (deadline ≤ 7d, OA coming
  up, waiting 14d+ …) and filters, including **rejected-at-stage** (multi-select), are shared
  across Board, List and Companies. Shortcuts: `/` search, `n` new application.
- **Insights** — next-three-weeks radar (OA, interviews, deadlines), a "needs attention" list,
  funnel with step conversion, **where I get rejected** (count, share, average days per stage),
  online-assessment timing and results, how long answers take, applications per week, status
  mix, response rate by tier / cycle / country, and an application-rhythm heatmap.
- **Rejection stage** — each rejected application records `rejectionStage`, `rejectionDate` and
  `rejectionStageSource`. When status becomes Rejected, empty fields are pre-filled from
  `statusHistory` (last of OA / Phone Screen / Onsite / Offer before the rejection, otherwise
  "Application / Resume Screen"); a value you set is never overwritten. Backups stay
  `schema: "coop-tracker"`, `version: 2` (the fields are optional; missing means empty).
- **Calendar / Timeline** — a horizontal timeline plotting each company's window-opens and
  deadline so crunch periods pop out. Free-text/estimated windows are listed separately.
- **Referrals** — track contacts from first outreach through a confirmed referral.
- **Interviews** — log each round with topics, a 1–5 self-rating, result, and what to improve.
- **Colour system** — one colour per status, defined once and reused by tags, board and charts,
  always paired with a text label (never colour alone). Urgency chips compute "in X days" from dates.
- **Light / dark** toggle, fully responsive, keyboard-friendly, WCAG-AA-minded contrast.
- **Toasts** on save/import/export and **confirm dialogs** before deletes.

> ⚠️ All seeded application windows are **estimates**. The primary channel for a January
> co-op is **Northeastern NUworks** (spring co-op postings open ~early-to-mid September 2026,
> interviews Oct–Nov 2026). Many FAANG run summer-only internships (open ~Jul–Nov 2026, rolling).
> **Verify every date on NUworks and each company's careers page.**

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Build a static bundle and preview it:

```bash
npm run build      # outputs to dist/
npm run preview    # serves the production build locally
```

The `dist/` folder is fully static — you can also serve it with any static file server
(e.g. `npx serve dist`).

## Data: backup & restore

- **Export to JSON** (top bar) downloads `coop-tracker-backup-YYYY-MM-DD.json`.
- **Import from JSON** restores from a backup file (accepts the export envelope or a bare
  state object). Importing **replaces** current data, so export first if unsure.
- Seed data loads automatically on first run when storage is empty.

Use Export to move data between machines or browsers — everything is local to one browser otherwise.

## Deploy to GitHub Pages

`vite.config.js` uses `base: './'` (relative asset paths), so the same build works from a
GitHub Pages **project subpath** (`https://<user>.github.io/<repo>/`) without extra config.
A `public/404.html` SPA fallback is included.

### Option A — GitHub Actions (recommended)

This repo includes `.github/workflows/deploy.yml`. Push to `main`, then in your repo go to
**Settings → Pages → Build and deployment → Source: GitHub Actions**. Every push to `main`
builds and publishes `dist/`.

### Option B — manual

```bash
npm run build
npx gh-pages -d dist        # or commit dist/ to a gh-pages branch yourself
```

Then set **Settings → Pages → Source** to the `gh-pages` branch.

## Project structure

```
src/
  lib/            constants (colors/options), date+urgency helpers, seed data, storage/export/import
  store.jsx       app state, CRUD, toasts, theme — provided via React context
  components/
    ApplicationForm.jsx
    ui/           Badges (StatusPill/TierTag/PriorityTag/UrgencyBadge), KpiCard, Modal,
                  ConfirmDialog, Toasts, Icons
  views/          Applications (+ Kanban board, ApplicationsTable, CompanyGroups), Insights, Timeline, Resumes, Calendar, Referrals, Interviews
  App.jsx         layout: sidebar nav + top bar (import/export/theme)
```
