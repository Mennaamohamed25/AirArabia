# Quickstart & Validation

## Prerequisites
.NET SDK 10, Node 20+.

## Run locally
```bash
cd backend/RideTracker.Api && dotnet run          # http://localhost:5080 (SQLite, seeded)
cd frontend && npm install && npm run dev          # http://localhost:5173
```
Seeded accounts (password `Pass@123`): `driver`, `manager`, `hr`, `admin`.

## Validate
1. `driver` → Start Ride (allow location, odometer 1000) → wait → Stop (1012) → purpose + fee 100 EGP + photo → Submit. Expect status Pending, total = fuel + 100.
2. `hr` dashboard shows the active ride within 15 s, then the submission.
3. `manager` → Approvals → open ride → Approve.
4. `hr` → Monthly → close current month → export PDF/Excel; ride shows Paid.
5. Ride details → Download receipt (PDF).
6. Switch to العربية → layout RTL.

## Automated tests
```bash
cd backend && dotnet test
cd frontend && npx playwright install chromium && npm run test:e2e
```

## Deploy
- Backend: `dotnet publish -c Release` → upload via MonsterASP WebDeploy/FTP; set `Database__Provider=SqlServer`, `ConnectionStrings__Default`, `Jwt__Key`, `Cors__Origins` (Vercel URL).
- Frontend: Vercel project root `frontend`, env `VITE_API_URL=https://<your-site>.runasp.net`.
