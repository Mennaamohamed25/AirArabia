# Feature Specification: Driver Ride Tracker

**Feature Branch**: `001-driver-ride-tracker`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Driver Ride Tracker for Air Arabia (Egypt office). Drivers run errands using 92-octane petrol. A mobile-first web app where the driver starts a ride (GPS + odometer), HR sees it live, the driver stops the ride, distance and fuel cost are calculated, the driver enters purpose and fees with a receipt photo, the manager approves or rejects, HR pays monthly with a monthly close and report, PDF receipts can be downloaded, and old data is cleaned up to fit free hosting. Roles: Driver, Manager, HR, Admin. Arabic + English (RTL). Modern UI inspired by the Air Arabia brand. End-to-end UI tests covering main flows. Everything hosted for free."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Driver records a ride (Priority: P1)

The driver opens the app on their phone, presses a large **Start Ride** button, enters the
car's odometer reading (optionally takes a photo of it), and the app records the start
location. While driving, the app keeps recording the location every 20–30 seconds and keeps
the screen awake. At the destination the driver presses **Stop Ride**, enters the end
odometer reading, and the app shows the distance driven and the calculated fuel cost.

**Why this priority**: Without ride recording there is nothing to approve or pay; this is the
core value of the system.

**Independent Test**: Log in as a driver, start a ride, simulate movement, stop the ride, and
verify that the distance, duration and fuel cost are shown and saved.

**Acceptance Scenarios**:

1. **Given** a logged-in driver with no active ride, **When** they press
   Start Ride and enter a valid odometer reading, **Then** a ride is created with start time,
   start location and start odometer, and the screen switches to the "ride in progress" view.
2. **Given** a ride in progress, **When** 30 seconds pass with location available, **Then** a
   new location point is recorded for the ride.
3. **Given** a ride in progress, **When** location stops being received for more than 2
   minutes (app in background, permission revoked, no signal), **Then** the driver sees a
   clear warning and the ride is marked as having a tracking gap.
4. **Given** a ride in progress, **When** the driver presses Stop Ride and enters an end
   odometer reading greater than the start reading, **Then** the ride ends and the app shows
   GPS distance, odometer distance, duration and fuel cost.
5. **Given** a ride in progress, **When** the driver enters an end odometer lower than the
   start odometer, **Then** the app rejects the value with an explanatory message.
6. **Given** a driver who already has an active ride, **When** they open the app on any
   device, **Then** they see the active ride and cannot start a second one.

---

### User Story 2 - Driver submits ride purpose and fees (Priority: P1)

After stopping a ride, the driver enters the purpose of the ride (e.g., "Brought printer
toner from supplier") and any extra fees paid (e.g., 100 EGP for parking, tolls, or purchases),
attaches a receipt photo for each fee, and submits the ride for manager approval.

**Why this priority**: Fees are part of what the driver is owed, and submission is the handoff
to approval.

**Independent Test**: Complete a ride, add a purpose and a 100 EGP fee with a photo, submit,
and verify the ride appears as "Pending approval" with the correct total.

**Acceptance Scenarios**:

1. **Given** a stopped ride, **When** the driver enters a purpose, adds a fee of 100 EGP with
   type "Parking" and a receipt photo, and submits, **Then** the ride status becomes
   "Pending approval" and the total = fuel cost + 100 EGP.
2. **Given** a stopped ride, **When** the driver submits with no purpose, **Then** submission
   is blocked with a message that purpose is required.
3. **Given** a submitted ride, **When** the driver views it, **Then** they cannot edit it.
4. **Given** a ride with no extra fees, **When** the driver submits, **Then** the total equals
   the fuel cost only.

---

### User Story 3 - Manager approves or rejects rides (Priority: P1)

The manager sees a list of rides waiting for approval. For each ride they see the driver,
date, purpose, route on a map, GPS and odometer distance, fuel cost, fees with receipt
photos, and any warnings (distance mismatch, tracking gaps). They approve or reject the ride
with an optional comment (required when rejecting).

**Why this priority**: The company must not pay any ride without manager approval.

**Independent Test**: With one pending ride, log in as manager, open it, approve it, and
verify the status changes and the decision is recorded with name and time.

**Acceptance Scenarios**:

1. **Given** a pending ride, **When** the manager approves it, **Then** its status becomes
   "Approved" and the manager's name, time and comment are recorded.
2. **Given** a pending ride, **When** the manager rejects it without a comment, **Then** the
   system requires a rejection reason.
3. **Given** a ride where GPS distance and odometer distance differ by more than 15%,
   **When** the manager opens it, **Then** a visible warning is shown and the manager chooses
   which distance to pay (GPS or odometer) before approving.
4. **Given** a rejected ride, **When** the driver views their rides, **Then** they see the
   rejection and the reason.

---

### User Story 4 - HR live dashboard (Priority: P2)

HR opens a dashboard that refreshes automatically every 10–15 seconds. It shows rides in
progress right now (driver, start time, start location, latest location), rides just
submitted, and rides approved and waiting for payment, with a clear highlight when something
new appears.

**Why this priority**: HR needs to know when a driver starts and ends a ride; this replaces
messaging apps.

**Independent Test**: Open the HR dashboard, start a ride as a driver in another session, and
verify it appears on the dashboard within 15 seconds without a manual refresh.

**Acceptance Scenarios**:

1. **Given** HR has the dashboard open, **When** a driver starts a ride, **Then** the ride
   appears in "Active rides" within 15 seconds with a "new" highlight.
2. **Given** an active ride on the dashboard, **When** the driver stops it, **Then** it moves
   out of "Active rides" within 15 seconds.
3. **Given** a driver submits a ride, **When** the dashboard refreshes, **Then** it appears in
   "New submissions".

---

### User Story 5 - Monthly payment and close (Priority: P2)

At the end of each month HR opens the monthly view, sees every approved ride for each driver
with totals (distance, fuel cost, fees, total owed), marks the month as paid, and exports a
monthly report. After closing, the month is locked.

**Why this priority**: Drivers are paid monthly; this turns approvals into payments.

**Independent Test**: With approved rides in a month, close the month as HR, export the
report, and verify totals match and rides become "Paid" and read-only.

**Acceptance Scenarios**:

1. **Given** approved rides in September, **When** HR opens September, **Then** totals per
   driver and a grand total are shown.
2. **Given** HR closes September, **When** the close completes, **Then** all approved
   September rides become "Paid", the month is locked, and the close records who and when.
3. **Given** a closed month, **When** HR exports, **Then** they download a PDF and a
   spreadsheet with the same totals shown on screen.
4. **Given** pending (not yet approved) rides in the month, **When** HR tries to close it,
   **Then** HR is warned and those rides are carried into the next month instead of paid.

---

### User Story 6 - Download PDF receipts (Priority: P2)

Any user allowed to see a ride can download a PDF receipt for it showing company branding,
driver, date, purpose, distance, fuel price used, fuel cost, fees, total, status and approver.
Drivers and HR can also download a monthly statement.

**Why this priority**: Needed for accounting records and for the driver.

**Independent Test**: Open an approved ride and download the receipt; verify the values match
the ride details.

**Acceptance Scenarios**:

1. **Given** an approved ride, **When** the driver presses Download Receipt, **Then** a PDF
   is downloaded with all values matching the ride.
2. **Given** a closed month, **When** a driver downloads their monthly statement, **Then** it
   lists only their own rides and totals.

---

### User Story 7 - Admin manages users, cars and fuel prices (Priority: P2)

The admin creates and deactivates users and assigns roles; registers cars with their fuel
consumption (km per liter) and assigns them to drivers; and records the 92-octane price per
liter with the date it starts to apply.

**Why this priority**: Calculations depend on correct cars and prices, but a seeded initial
setup is enough for a first demo.

**Independent Test**: As admin, add a new fuel price effective today, then complete a ride and
verify the new price is used; verify rides from before keep the old price.

**Acceptance Scenarios**:

1. **Given** price 17.75 EGP effective 2026-09-01 and price 19.25 EGP effective 2026-10-01,
   **When** a ride happens on 2026-10-05, **Then** 19.25 EGP is used.
2. **Given** a ride already calculated, **When** the admin adds a new price, **Then** the old
   ride's cost does not change.
3. **Given** a deactivated user, **When** they try to log in, **Then** access is denied.

---

### User Story 8 - Automatic data cleanup (Priority: P3)

To stay within the small storage of free hosting, detailed location points are removed as
soon as a ride ends (only a compact route shape is kept), and photos and route shapes older
than the retention period (default 3 months, only for closed months) are removed, keeping the
financial totals forever. The admin sees current storage usage.

**Why this priority**: Not needed on day one but essential for running for free long-term.

**Independent Test**: End a ride and verify detailed points are gone but the route still
displays; run cleanup on a closed month older than 3 months and verify photos are removed
and totals remain.

**Acceptance Scenarios**:

1. **Given** a ride that just ended, **When** the end is processed, **Then** detailed location
   points are deleted and a compact route is stored that still displays on the map.
2. **Given** a closed month older than the retention period, **When** cleanup runs, **Then**
   photos and routes for that month are removed while ride totals and decisions remain.
3. **Given** a month that is not closed, **When** cleanup runs, **Then** nothing in that
   month is removed.

---

### User Story 9 - Bilingual, branded, mobile-first experience (Priority: P2)

All users can switch between Arabic (right-to-left) and English. The look is a modern, clean
design inspired by the Air Arabia brand: red and white, rounded cards, bold primary actions,
and very large Start/Stop buttons for drivers that are usable with one hand.

**Why this priority**: Drivers need an easy phone experience; the company wants a branded tool.

**Independent Test**: Switch language to Arabic and verify all screens flip to right-to-left
with translated labels; open the driver screen on a phone-sized screen and verify the
Start button is reachable and readable.

**Acceptance Scenarios**:

1. **Given** any screen, **When** the user switches to Arabic, **Then** all text is Arabic and
   the layout is right-to-left, and the choice is remembered.
2. **Given** a phone-sized screen, **When** the driver opens the home screen, **Then** the
   Start Ride button is visible without scrolling.

---

### User Story 10 - Automated end-to-end UI tests (Priority: P2)

The team has automated browser tests that run the main flows end to end: driver
start/stop/submit, manager approve/reject, HR dashboard live update and monthly close,
receipt download, language switch, and role access restrictions.

**Why this priority**: Prevents regressions in money-related flows on every change.

**Independent Test**: Run the test suite against a test environment and verify all main-flow
tests pass, with simulated location.

**Acceptance Scenarios**:

1. **Given** the test environment with seeded users, **When** the suite runs, **Then** each
   main flow listed above has at least one passing test.
2. **Given** a driver account, **When** the test tries to open manager, HR or admin pages,
   **Then** access is denied.

---

### Edge Cases

- Driver loses internet during a ride: location points are kept on the phone and sent when
  connection returns; start/stop actions wait and retry without losing data.
- Driver forgets to stop a ride: rides running longer than 12 hours are flagged on the HR
  dashboard; the driver can still stop it and must enter the end odometer.
- Location permission denied: Start Ride is blocked with instructions on how to enable it.
- Phone screen locked or app closed during a ride: a tracking gap is recorded and shown to the
  manager; the odometer distance is available as backup.
- GPS points with poor accuracy (worse than 50 m) or impossible jumps (implied speed over
  160 km/h) are ignored in the distance.
- Very short ride (under 0.2 km): allowed but flagged.
- No fuel price configured: Start Ride is blocked with a message to contact HR.
- Fee amount zero, negative, or unrealistically large (over 5,000 EGP): rejected or flagged.
- Drivers use their own cars: no car assignment is needed; km per liter comes from the driver
  (set by HR) or the company default.
- Two managers act on the same ride at once: only the first decision is saved; the second
  sees that it is already decided.
- Photo upload fails: the driver can retry; submission waits for required receipt photos.

## Requirements *(mandatory)*

### Functional Requirements

**Access & roles**

- **FR-001**: System MUST require login with email and password; sessions expire
  after a period of inactivity and the driver session stays valid during an active ride.
- **FR-002**: System MUST support three roles — Driver, Manager, HR (HR is the main role) — and restrict every
  screen and action to the allowed roles on the server, not only in the interface.
- **FR-003**: Drivers MUST see only their own rides; Managers and HR see all rides.

**Ride recording**

- **FR-004**: Drivers MUST be able to start a ride only if they have location
  permission, and no other active ride.
- **FR-005**: At start, the system MUST record time, location, and the start odometer reading
  (photo optional).
- **FR-006**: During a ride, the system MUST record location every 20–30 seconds while the app
  is open, keep the screen awake, and warn the driver when no location is received for more
  than 2 minutes.
- **FR-007**: The system MUST store location points recorded while offline and send them when
  connection returns.
- **FR-008**: At stop, the system MUST record time, location and the end odometer reading,
  which must be greater than the start reading.
- **FR-009**: The system MUST calculate GPS distance from recorded points, ignoring points with
  accuracy worse than 50 m and jumps implying speed over 160 km/h.
- **FR-010**: The system MUST calculate odometer distance (end − start) and flag the ride when
  GPS and odometer distances differ by more than 15%.

**Cost calculation**

- **FR-011**: Fuel cost MUST be calculated as distance (km) ÷ car consumption (km/L) ×
  92-octane price (EGP/L), using the price and consumption effective on the ride date.
- **FR-012**: The paid distance MUST default to GPS distance; when the ride is flagged for
  mismatch, the manager MUST choose GPS or odometer distance before approving.
- **FR-013**: The price, consumption and calculated amounts MUST be stored with each ride so
  later setting changes do not alter past rides. All money is in EGP with 2 decimals.

**Submission & approval**

- **FR-014**: After stopping, drivers MUST enter a purpose and may add zero or more fees, each
  with type (Parking, Toll, Purchase, Other), amount and a receipt photo.
- **FR-015**: Photos MUST be reduced in size on the phone before upload (target ≤ 150 KB).
- **FR-016**: After submission, the ride MUST become read-only for the driver with status
  "Pending approval".
- **FR-017**: Managers MUST be able to approve or reject pending rides; rejection requires a
  reason; every decision records who, when, and comment.
- **FR-018**: Ride status MUST follow: In progress → Stopped → Pending approval →
  Approved / Rejected → Paid.

**HR dashboard & monthly payment**

- **FR-019**: The HR dashboard MUST refresh automatically every 10–15 seconds and show active
  rides, new submissions, approved-unpaid rides, and flagged rides, highlighting new items.
- **FR-020**: HR MUST be able to view any month with per-driver and overall totals (rides,
  distance, fuel cost, fees, total).
- **FR-021**: HR MUST be able to close a month: approved rides become Paid, the month is
  locked, unapproved rides move to the next month, and the close records who and when.
- **FR-022**: HR MUST be able to export a month as PDF and spreadsheet.

**Receipts**

- **FR-023**: Authorized users MUST be able to download a branded PDF receipt per ride and a
  monthly statement per driver.

**Administration**

- **FR-024**: HR MUST manage users by email (create, deactivate, reset password, assign role),
  each driver's own-car km per liter (optional; company default otherwise), and 92-octane fuel
  prices with effective dates.
- **FR-025**: HR MUST be able to set the data retention period (default 3 months).

**Data cleanup**

- **FR-026**: When a ride ends, detailed location points MUST be replaced by a compact route
  shape that can still be displayed on a map.
- **FR-027**: A cleanup MUST remove photos and route shapes for closed months older than the
  retention period, keeping totals, statuses and decisions permanently.
- **FR-028**: HR MUST see current storage usage compared with the hosting limit.

**Experience**

- **FR-029**: All screens MUST be available in Arabic (right-to-left) and English, with the
  choice remembered per user.
- **FR-030**: The interface MUST be mobile-first, installable to the phone home screen, and
  follow a modern design inspired by the Air Arabia brand (red and white, rounded cards, bold
  primary actions, large Start/Stop buttons).

**Quality**

- **FR-031**: Automated end-to-end browser tests MUST cover: driver start/stop/submit, manager
  approve/reject (including mismatch choice), HR dashboard live update, monthly close and
  export, receipt download, language switch, and role access restrictions.

### Key Entities

- **User**: A person who logs in; name, login, role (Driver/Manager/HR/Admin), language
  preference, active flag.
- **Driver km per liter**: Fuel use of the driver's own car (optional; company default in Settings).
- **Fuel Price**: 92-octane price per liter in EGP with the date it takes effect.
- **Ride**: One trip by one driver in one car; start/end time, start/end location, start/end
  odometer (and optional photos), GPS distance, odometer distance, paid distance and its
  source, fuel price and consumption used, fuel cost, purpose, status, flags (mismatch,
  tracking gap, too long, too short), compact route shape.
- **Location Point**: Temporary GPS reading during a ride (time, position, accuracy); removed
  when the ride ends.
- **Fee**: Extra cost on a ride; type, amount, receipt photo.
- **Approval Decision**: Manager's approve/reject on a ride; who, when, comment, chosen
  distance source.
- **Monthly Period**: A calendar month; status (open/closed), who closed it and when, totals.
- **Settings**: Retention period and other system-wide values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A driver can start a ride in under 30 seconds and stop and submit a ride
  (including one fee with photo) in under 2 minutes.
- **SC-002**: HR sees a newly started or stopped ride on the dashboard within 15 seconds,
  with no manual refresh.
- **SC-003**: For rides where tracking had no gaps, GPS distance is within 10% of odometer
  distance in at least 90% of rides.
- **SC-004**: 100% of paid amounts match the formula using the settings in effect on the ride
  date; monthly report totals equal the sum of their rides exactly.
- **SC-005**: No ride is marked Paid without a recorded manager approval (0 exceptions).
- **SC-006**: Average stored data per ride (after the ride ends) is under 200 KB including
  photos, so a year of daily rides fits within 1 GB.
- **SC-007**: Running cost is 0 EGP per month.
- **SC-008**: All end-to-end test flows pass before every release.
- **SC-009**: Every screen is fully usable in Arabic right-to-left and in English on a
  phone-sized screen.

## Assumptions

- The system is for one company office in Egypt with a small number of users (about 1–5
  drivers, a few managers and HR staff); all times use Egypt local time.
- Drivers are reimbursed for fuel based on distance plus approved fees; the car may be the
  driver's own or a company car, and the calculation is the same.
- The 92-octane price is entered manually by the admin when the government changes it; no
  automatic price feed is used.
- Default mismatch threshold is 15%, default retention period is 3 months, default
  long-ride flag is 12 hours; all can be adjusted later.
- Location is recorded reliably only while the app is open on screen; the odometer reading is
  the backup when tracking has gaps.
- Drivers have smartphones with a modern browser, GPS and mobile data.
- Maps use a free map provider; no paid map service is used.
- One manager approval is enough for any ride; there is no multi-level approval.
- Users are created by the admin; there is no public self-registration.
- Brand styling is inspired by Air Arabia's colors and feel for this internal company tool.
