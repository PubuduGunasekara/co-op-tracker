# Co-op Tracker

A polished, **static, offline-first** single-page app for managing software-engineering
co-op / internship applications. No backend, no database, no login — your data lives in
your browser's `localStorage`, with JSON **Export/Import** for backups and portability.

Built with **React + Vite + Tailwind CSS**.

## Features

- **Dashboard** — KPI cards (applied, in-interview, offers, rejections, response rate,
  referrals secured, windows opening ≤ 30 days, deadlines ≤ 14 days) plus a pipeline funnel
  (Applied → OA → Phone → Onsite → Offer) and a "crunch radar".
- **Applications** — switch between a sortable/filterable **inline-editable table** (with a
  quick-add row) and a **drag-and-drop Kanban board**. Dragging a card changes its status and
  records `statusHistory` + `lastActivityDate`. Filter by tier, status, cycle, source, priority;
  search by company/role; sort by deadline, window, priority, or name.
- **Calendar / Timeline** — a horizontal timeline plotting each company's window-opens and
  deadline so crunch periods pop out. Free-text/estimated windows are listed separately.
- **Referrals** — track contacts from first outreach through a confirmed referral.
- **Interviews** — log each round with topics, a 1–5 self-rating, result, and what to improve.
- **Color system** — consistent semantic **status** and **tier** colors everywhere, always shown
  as **icon + label + color** (never color alone) for accessibility. Urgency badges (green /
  amber / red) compute "opens/closes in X days" from dates.
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
  views/          Dashboard, Applications (+ ApplicationsTable, Kanban), Calendar, Referrals, Interviews
  App.jsx         layout: sidebar nav + top bar (import/export/theme)
```
