# Tasks: Driver Ride Tracker

**Input**: Design documents from `specs/001-driver-ride-tracker/`
**Tests**: Requested (Playwright E2E — US10; xUnit for money/distance math).

## Phase 1: Setup

- [x] T001 Create solution `backend/RideTracker.sln` with `backend/RideTracker.Api` (net10.0 web) and `backend/RideTracker.Tests` (xUnit) projects
- [x] T002 [P] Add EF Core SqlServer + Sqlite + JwtBearer packages in `backend/RideTracker.Api/RideTracker.Api.csproj`
- [x] T003 [P] Scaffold Vite React TS app in `frontend/` with Tailwind 4, react-router, i18next, react-leaflet, jspdf, html-to-image, xlsx, browser-image-compression, vite-plugin-pwa, @playwright/test
- [x] T004 [P] Add `frontend/vercel.json` SPA rewrite and `.gitignore` at repo root

## Phase 2: Foundational

- [x] T005 Entities + enums per data-model.md in `backend/RideTracker.Api/Data/Entities.cs` (Username "string(50) unique", Purpose "string(500)", Fee Amount "0 < x ≤ 5000")
- [x] T006 `AppDbContext` with provider switch (SqlServer/Sqlite) in `backend/RideTracker.Api/Data/AppDbContext.cs`
- [x] T007 Seed users (driver/manager/hr/admin, `Pass@123`), car, consumption, fuel price, settings in `backend/RideTracker.Api/Data/Seed.cs`
- [x] T008 JWT auth, role policies, CORS, JSON enums, error handling in `backend/RideTracker.Api/Program.cs`
- [x] T009 Cairo time helper in `backend/RideTracker.Api/Services/EgyptTime.cs`
- [x] T010 Auth endpoints (login, me, language) in `backend/RideTracker.Api/Endpoints/AuthEndpoints.cs`
- [x] T011 [P] API client + types + auth context in `frontend/src/api/`
- [x] T012 [P] i18n setup with `en.json`/`ar.json` and `dir` switching in `frontend/src/i18n/`
- [x] T013 [P] Brand theme, Layout with role-based nav, Login page in `frontend/src/components/Layout.tsx`, `frontend/src/pages/LoginPage.tsx`
- [x] T014 Role-guarded routes in `frontend/src/App.tsx`

## Phase 3: US1 Driver records a ride (P1) 🎯 MVP

- [x] T015 [P] [US1] xUnit tests for distance filters, polyline, fuel cost in `backend/RideTracker.Tests/RideMathTests.cs`
- [x] T016 [US1] `RideMath` (haversine, accuracy ≤ 50 m, speed ≤ 160 km/h, cost) and `Polyline` in `backend/RideTracker.Api/Domain/`
- [x] T017 [US1] Ride endpoints start/points/stop/active in `backend/RideTracker.Api/Endpoints/RideEndpoints.cs` (points deleted at stop, polyline saved)
- [x] T018 [US1] Geolocation tracker with wake lock, offline queue, 2-minute gap warning in `frontend/src/lib/tracker.ts`
- [x] T019 [US1] Driver home with big Start/Stop, odometer dialog with photo in `frontend/src/pages/DriverHome.tsx`

## Phase 4: US2 Submit purpose and fees (P1)

- [x] T020 [US2] Submit endpoint + photo endpoint in `backend/RideTracker.Api/Endpoints/RideEndpoints.cs`
- [x] T021 [P] [US2] Photo compression input in `frontend/src/components/PhotoInput.tsx`
- [x] T022 [US2] Submit form (purpose, fees list) in `frontend/src/pages/DriverHome.tsx`
- [x] T023 [US2] Driver ride history + ride detail page in `frontend/src/pages/RidesPage.tsx`, `frontend/src/pages/RideDetailPage.tsx`

## Phase 5: US3 Manager approval (P1)

- [x] T024 [US3] Decide endpoint (first decision wins, reject needs comment, distance source recompute) in `backend/RideTracker.Api/Endpoints/RideEndpoints.cs`
- [x] T025 [P] [US3] Route map component (Leaflet + decoded polyline) in `frontend/src/components/RouteMap.tsx`
- [x] T026 [US3] Approvals list + decision panel on ride detail in `frontend/src/pages/ApprovalsPage.tsx`

## Phase 6: US4 HR live dashboard (P2)

- [x] T027 [US4] Dashboard endpoint in `backend/RideTracker.Api/Endpoints/DashboardEndpoints.cs`
- [x] T028 [US4] Dashboard page polling every 12 s with "new" highlight in `frontend/src/pages/DashboardPage.tsx`

## Phase 7: US5 Monthly close (P2)

- [x] T029 [US5] Month summary + close endpoints in `backend/RideTracker.Api/Endpoints/MonthEndpoints.cs`
- [x] T030 [US5] Monthly page with close + PDF/Excel export in `frontend/src/pages/MonthlyPage.tsx`, `frontend/src/lib/exporters.ts`

## Phase 8: US6 PDF receipts (P2)

- [x] T031 [US6] Branded receipt component + PDF download in `frontend/src/components/Receipt.tsx`, `frontend/src/lib/pdf.ts`

## Phase 9: US7 Admin (P2)

- [x] T032 [US7] Admin endpoints (users, cars, consumption, fuel prices, settings) in `backend/RideTracker.Api/Endpoints/AdminEndpoints.cs`
- [x] T033 [US7] Admin page with tabs in `frontend/src/pages/AdminPage.tsx`

## Phase 10: US8 Data cleanup (P3)

- [x] T034 [US8] `CleanupService` (daily + on demand + storage stats) in `backend/RideTracker.Api/Services/CleanupService.cs`
- [x] T035 [US8] Storage & cleanup tab in `frontend/src/pages/AdminPage.tsx`

## Phase 11: US9 Bilingual branded UX (P2)

- [x] T036 [US9] Complete Arabic translations, Cairo font, PWA manifest/icons in `frontend/src/i18n/ar.json`, `frontend/vite.config.ts`, `frontend/public/`

## Phase 12: US10 E2E tests (P2)

- [x] T037 [US10] Playwright config starting API (E2E env, fresh SQLite) and Vite (`--mode e2e`) in `frontend/playwright.config.ts`
- [x] T038 [US10] E2E specs: ride flow, approval, dashboard, monthly close, receipt, language, role access in `frontend/e2e/*.spec.ts`

## Phase 13: Polish

- [x] T039 Root `README.md` with run/deploy steps
- [x] T040 Run xUnit + Playwright, fix failures; start app and open browser

## Dependencies

Setup → Foundational → US1 → US2 → US3 → (US4, US5, US6, US7, US8 in any order) → US9 → US10 → Polish.

## Parallel examples

- Phase 1: T002, T003, T004 together.
- Phase 2: T011, T012, T013 together after T008.
- US1: T015 alongside T016.

## Implementation strategy

MVP = Phases 1–5 (driver records + submits, manager approves). Then dashboard and monthly
payment, receipts, admin, cleanup, then full E2E coverage.
