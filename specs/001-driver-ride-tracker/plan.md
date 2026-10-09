# Implementation Plan: Driver Ride Tracker

**Branch**: `001-driver-ride-tracker` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-driver-ride-tracker/spec.md`

## Summary

A mobile-first, bilingual (Arabic RTL / English) PWA where drivers start and stop rides with
GPS + odometer, submit purpose and fees with compressed receipt photos, managers approve or
reject, and HR watches a polling live dashboard and closes each month. The frontend is a
React + Vite SPA on Vercel; the backend is an ASP.NET Core Web API on MonsterASP with SQL
Server. Distance and money are computed on the server; raw GPS points are replaced by an
encoded polyline when a ride ends. PDFs/Excel are generated in the browser. Playwright covers
the main flows end to end with mocked geolocation; xUnit covers the money/distance math.

## Technical Context

**Language/Version**: C# / .NET 10 (LTS, supported to Nov 2028; .NET 8 support ends
Nov 2026), TypeScript 5 / Node 24 for the frontend

**Primary Dependencies**: Backend: ASP.NET Core Web API, EF Core (SqlServer + Sqlite
providers), JwtBearer. Frontend: React 19, Vite, Tailwind CSS 4, react-router, i18next,
Leaflet/react-leaflet (OpenStreetMap tiles), jsPDF + html-to-image, SheetJS (xlsx),
browser-image-compression, vite-plugin-pwa

**Storage**: SQL Server (MonsterASP free) in production; SQLite file for local dev and E2E.
Photos stored as compressed bytes in a `Photos` table

**Testing**: xUnit (calculation + polyline + state rules), Playwright (E2E, Chromium,
mocked geolocation)

**Target Platform**: Mobile browsers (Android Chrome, iOS Safari 16.4+), desktop browsers
for Manager/HR/Admin; API on Windows/IIS (MonsterASP)

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Dashboard poll response < 300 ms with tens of rides; ride start in
< 30 s end-to-end (SC-001); dashboard sees changes ≤ 15 s (SC-002)

**Constraints**: $0 hosting, ~1 GB storage budget, HTTPS only, API may cold-start after
idle (free hosting), location only while app open

**Scale/Scope**: 1 office, ≤ 5 drivers, ≤ 20 users, ~10 rides/day, ~15 screens

## Constitution Check

| Principle | Status | How the design complies |
|---|---|---|
| I. Zero Cost | PASS | Vercel Hobby, MonsterASP free + SQL Server, OSM tiles, all libs MIT/Apache; no paid APIs |
| II. Small Data Footprint | PASS | Points deleted at stop → polyline; photos compressed ≤150 KB client side; month close + retention cleanup; storage page |
| III. Mobile-First PWA | PASS | PWA manifest + service worker, Wake Lock, HTTPS, i18n with `dir="rtl"` |
| IV. Live Dashboard Notifications | PASS | `GET /api/dashboard` polled every 12 s; no messaging services |
| V. Trust but Verify | PASS | Accuracy/speed filters, odometer cross-check (15%), manager approval mandatory, decisions audited |
| VI. Simplicity | PASS | 2 projects + tests; no repository layer; EF Core directly in endpoints/services; 4 roles enforced with `[Authorize(Roles)]` |
| VII. Configurable Money Rules | PASS | Dated `FuelPrices` and `CarConsumptions`; values snapshotted on each ride |

Post-design re-check: PASS (no violations; Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/001-driver-ride-tracker/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── RideTracker.Api/
│   ├── Program.cs              # DI, auth, CORS, EF, endpoint mapping, seeding
│   ├── Data/                   # AppDbContext, entities, Seed
│   ├── Domain/                 # RideMath (distance, cost), Polyline, enums
│   ├── Endpoints/              # Auth, Rides, Dashboard, Months, Admin
│   ├── Services/               # CleanupService, Clock/EgyptTime
│   └── appsettings*.json
└── RideTracker.Tests/          # xUnit

frontend/
├── src/
│   ├── api/                    # fetch client, types
│   ├── components/             # Layout, cards, map, photo input, receipt
│   ├── pages/                  # Login, Driver*, Manager*, Hr*, Admin*
│   ├── i18n/                   # en.json, ar.json
│   ├── lib/                    # geolocation tracker, offline queue, pdf, excel, polyline
│   └── main.tsx
├── e2e/                        # Playwright specs
├── playwright.config.ts
└── vercel.json                 # SPA rewrites
```

**Structure Decision**: Web application with `backend/` and `frontend/` folders. Playwright
lives in `frontend/e2e` and starts both servers via `webServer`.

## Complexity Tracking

No violations.
