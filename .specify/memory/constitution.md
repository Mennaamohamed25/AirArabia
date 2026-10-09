<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0 (2026-10-09: drivers own their cars; no car assignment; per-driver or default km/L)
- 1.0.0 → 1.1.0 (2026-10-09: HR became the main role; Admin role removed; email login)
- Previous: (template, unversioned) → 1.0.0
- Modified principles: all placeholders replaced (initial adoption)
  - [PRINCIPLE_1..5] → I. Zero Cost (NON-NEGOTIABLE), II. Small Data Footprint,
    III. Mobile-First PWA, IV. Live Dashboard Notifications, V. Trust but Verify,
    VI. Simplicity over Cleverness, VII. Configurable Money Rules
- Added sections: Technology & Hosting Constraints, Development Workflow & Quality Gates
- Removed sections: none
- Templates: not modified (read at runtime per Spec Kit scope guard)
- Deferred TODOs: none
-->

# Driver Ride Tracker Constitution

## Core Principles

### I. Zero Cost (NON-NEGOTIABLE)

- Every component MUST run on a free plan: frontend on Vercel (free/Hobby), backend
  ASP.NET Core Web API on MonsterASP free hosting, database = the SQL Server included
  with MonsterASP.
- No paid third-party services, APIs, SDKs, or licenses. A library is allowed only if
  its license is free for this company's use.
- Any new dependency or service MUST state its free-tier limits in the plan.

**Rationale**: The business requirement is a working system with zero running cost.

### II. Small Data Footprint

- Raw GPS points are temporary: they MUST be deleted when a ride ends, keeping only a
  compressed (encoded) route polyline plus totals (distance, duration, cost).
- Receipt and odometer photos MUST be compressed on the client before upload
  (target ≤ ~150 KB each).
- A monthly close MUST export the month's report (PDF/Excel) and a cleanup job MUST
  purge photos and route polylines older than a configurable retention period
  (default 3 months), keeping only financial totals.
- New tables or stored files MUST include an estimate of their size growth.

**Rationale**: Free hosting provides limited database and disk space.

### III. Mobile-First PWA

- The driver experience MUST be designed for phones first and be installable as a
  Progressive Web App.
- All traffic MUST use HTTPS (required for browser geolocation and API calls).
- The UI MUST support Arabic and English, including full RTL layout.
- During an active ride the app MUST request a screen wake lock and warn the driver if
  location tracking is interrupted.

**Rationale**: Drivers use phones in the field; browsers only allow GPS on secure pages.

### IV. Live Dashboard Notifications

- HR and managers are notified through a live in-app dashboard that auto-refreshes by
  polling every 10–15 seconds, showing active rides and new submissions.
- Telegram, WhatsApp, SMS, and any paid messaging channel MUST NOT be used.
- Polling endpoints MUST be lightweight (return only changes or small summaries).

**Rationale**: Free, no external accounts, and works within the same web app.

### V. Trust but Verify

- Ride distance from GPS MUST be cross-checked with odometer readings entered at start
  and end; large differences MUST be flagged to the manager.
- GPS points with poor accuracy or impossible speed jumps MUST be filtered out.
- No ride or fee may be paid without explicit manager approval; every approval or
  rejection MUST record who, when, and an optional comment.
- Submitted rides are read-only for drivers once sent for approval.

**Rationale**: Payment is based on distance and claimed fees, so both need evidence.

### VI. Simplicity over Cleverness

- Minimal dependencies; prefer built-in browser and .NET features.
- Role-based access with exactly these roles: Driver, Manager, HR. HR is the main role: it
  creates all user accounts (identified by email) and manages cars, fuel prices, settings and
  storage. Only Managers approve rides. Every API endpoint MUST enforce role authorization on
  the server, and at least one active HR account MUST always exist.
- Introduce extra layers, services, or patterns only with written justification in the
  plan's complexity section.

**Rationale**: A small team must be able to maintain and host the system easily.

### VII. Configurable Money Rules

- Drivers use their own cars. The 92-octane fuel price per liter and the km per liter (per
  driver, or the company default) MUST be
  stored as settings with effective dates, editable by HR.
- A ride's cost MUST be calculated with the values effective on the ride date and stored
  with the ride so later price changes do not alter past rides.
- Formula: fuel cost = distance_km ÷ km_per_liter × price_per_liter; total = fuel cost +
  approved driver fees. All money in Egyptian Pounds (EGP), rounded to 2 decimals.

**Rationale**: Egypt changes fuel prices often; historical payments must stay accurate.

## Technology & Hosting Constraints

- Frontend: React + Vite PWA deployed to Vercel free plan.
- Backend: ASP.NET Core Web API (a .NET version supported by MonsterASP) with EF Core.
- Database: SQL Server on MonsterASP free plan.
- Receipts and reports (PDF) SHOULD be generated in the browser to save server resources.
- CORS MUST allow only the Vercel frontend origin(s).
- Secrets (connection strings, JWT keys) MUST NOT be committed to source control.

## Development Workflow & Quality Gates

- Follow the Spec Kit flow: specify → clarify → plan → tasks → implement.
- Every plan MUST include a Constitution Check confirming principles I–VII.
- Money calculations, distance calculation, and authorization rules MUST have automated
  tests before release.
- Before each deployment, verify free-plan storage usage and that cleanup jobs ran.

## Governance

- This constitution supersedes other project practices. Plans and reviews MUST verify
  compliance; violations require a written justification in the plan.
- Amendments are made via `/speckit-constitution`, documented in the Sync Impact Report,
  and versioned with semantic versioning: MAJOR for removed or redefined principles,
  MINOR for new principles or sections, PATCH for wording fixes.
- Compliance is reviewed at every plan and before every production deployment.

**Version**: 1.2.0 | **Ratified**: 2026-10-09 | **Last Amended**: 2026-10-09
