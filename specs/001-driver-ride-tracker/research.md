# Research: Driver Ride Tracker

## .NET version
- **Decision**: .NET 10 (LTS).
- **Rationale**: .NET 8 support ends 2026-11-10; .NET 10 is LTS to 2028. MonsterASP lists current .NET versions on the free plan.
- **Alternatives**: .NET 8 (expiring soon); if MonsterASP rejects .NET 10, retarget `net8.0` (no code changes needed beyond package versions).

## Database & local development
- **Decision**: EF Core with provider chosen by config: SQL Server in production, SQLite locally/E2E. Schema created with `EnsureCreated` for v1.
- **Rationale**: Zero install for dev and tests; same model on both. Times stored as UTC `DateTime` (SQLite cannot order `DateTimeOffset`).
- **Alternatives**: LocalDB (Windows only, heavier); EF migrations (add when the schema starts changing in production).

## Photos
- **Decision**: Compress in the browser (browser-image-compression, max 1280 px, ≤150 KB, JPEG) and send base64 in JSON; store bytes in a `Photos` table.
- **Rationale**: One storage system to back up and measure; JSON keeps the API simple.
- **Alternatives**: File system on MonsterASP (separate quota, harder cleanup), Cloudinary (third party).

## GPS tracking in the browser
- **Decision**: `navigator.geolocation.watchPosition` with high accuracy; send a point at most every 25 s (configurable; shorter in E2E). Wake Lock API while a ride is active. Points queued in `localStorage` and flushed when online. Warning after 2 min without a fix.
- **Rationale**: Only reliable free approach for a web app; odometer is the backup.

## Distance & route storage
- **Decision**: Haversine sum on the server over filtered points (accuracy ≤ 50 m, implied speed ≤ 160 km/h). At stop, encode the filtered points with Google polyline encoding (precision 5) and delete raw points.
- **Rationale**: ~1 KB per ride instead of hundreds of rows.

## Live dashboard
- **Decision**: Poll `GET /api/dashboard` every 12 s; "new" highlight computed client side by comparing ids with the previous poll.
- **Alternatives**: SignalR (WebSocket availability on the free host is uncertain; adds complexity).

## Auth
- **Decision**: JWT bearer (HS256, 7-day expiry, sliding by re-login), passwords hashed with ASP.NET Core `PasswordHasher<T>` (built into the shared framework). Token stored in `localStorage`.
- **Rationale**: Works cross-origin between Vercel and MonsterASP without cookie/SameSite issues.

## PDF & Excel
- **Decision**: Render a hidden branded receipt component, capture with `html-to-image`, place in jsPDF A4 (supports Arabic text because the browser renders it). Excel via SheetJS `xlsx`.
- **Alternatives**: jsPDF text API (no Arabic shaping), QuestPDF on server (uses server CPU/time).

## Maps
- **Decision**: Leaflet + OpenStreetMap tiles.
- **Rationale**: Free, no key. Fair-use is fine for a handful of users.

## Cleanup
- **Decision**: `BackgroundService` runs daily and also on demand (Admin "Run cleanup"); removes photos and polylines of rides in closed months older than retention.
- **Rationale**: Free hosting can recycle the app pool, so the manual button and the run-on-month-close are the fallback.

## Time zone
- **Decision**: Month/period and receipts use Africa/Cairo local time; storage in UTC.

## Branding
- **Decision**: Primary red `#E4002B`, deep red `#B8001F`, white surfaces, neutral grays, rounded-2xl cards, Inter (EN) + Cairo (AR) from Google Fonts.
- **Rationale**: Modern interpretation of the Air Arabia look for an internal tool.

## E2E testing
- **Decision**: Playwright `webServer` starts the API (`ASPNETCORE_ENVIRONMENT=E2E`, fresh SQLite, seeded users) and Vite (`--mode e2e`, short GPS interval). Geolocation mocked with `context.setGeolocation`.
