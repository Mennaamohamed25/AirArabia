# Air Arabia · Driver Ride Tracker

Drivers start/stop rides (GPS + odometer), submit fees with receipt photos, managers approve,
HR watches a live dashboard and pays monthly. Arabic/English, installable on phones. Runs on free hosting.

Spec, plan and tasks: [`specs/001-driver-ride-tracker/`](specs/001-driver-ride-tracker/) · Rules: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

## Run locally

```bash
# 1) API  → http://localhost:5080  (SQLite file, demo data)
cd backend/RideTracker.Api && dotnet run

# 2) Web  → http://localhost:5173
cd frontend && npm install && npm run dev
```

Demo accounts (password `Pass@123`):

| Email | Role |
|---|---|
| **hr@airarabia.com** | HR — main account: creates all other users, cars, fuel price, monthly payment |
| manager@airarabia.com | Manager — approves / rejects rides |
| driver@airarabia.com | Driver (has a car) |
| driver2@airarabia.com | Driver |

## Tests

```bash
cd backend && dotnet test                        # money / distance / polyline unit tests
cd frontend && npx playwright install chromium && npm run test:e2e   # 16 end-to-end UI tests
```

## Deploy (free)

The browser only talks to Vercel (HTTPS). Vercel forwards `/api/*` to the MonsterASP backend
(`frontend/vercel.json`), so the backend needs no CORS setup and works even before MonsterASP's
free-plan HTTPS is activated.

**Backend → MonsterASP.net (free plan)**
1. Control panel: create the website (ASP.NET Core / .NET 10) and an MSSQL database.
2. `cd backend/RideTracker.Api && dotnet publish -c Release -o ../../deploy/backend`
   (remove `appsettings.Development.json` / `appsettings.E2E.json` from the output).
3. In `deploy/backend/appsettings.Production.json` (never commit it) set the MSSQL connection
   string, a random `Jwt:Key` (32+ chars) and the first HR password (`Seed:HrPassword`).
4. Put the FTP details from the panel in `deploy/ftp.env` and run `bash deploy/upload-backend.sh`
   (or upload `deploy/backend/` to `wwwroot` with FileZilla).
5. Optional: open a MonsterASP support ticket to activate HTTPS for the free site.

**Frontend → Vercel (Hobby, free)**
1. Put the backend address in `frontend/vercel.json` (`https://<site>.runasp.net`).
2. `cd frontend && npx vercel login` once, then `npx vercel --prod`.

## After going live
- HR → Management → **Users**: create the managers and drivers (email + password).
- HR → Management → **92 fuel price**: enter the current price when the government changes it.
- HR → Management → **Settings**: set the company default km per liter; optionally set each driver's own km/L in **Users**.
- HR → **Monthly**: close the month after paying; photos/routes older than 3 months are then cleaned automatically.
