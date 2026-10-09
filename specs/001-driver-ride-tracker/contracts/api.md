# API Contract (REST, JSON, `Authorization: Bearer <jwt>`)

Errors: `400 {error: "code", message}` · 401 unauthenticated · 403 wrong role · 404 · 409 conflict.

## Auth
| Method | Path | Roles | Body → Response |
|---|---|---|---|
| POST | /api/auth/login | anon | `{username,password}` → `{token,user}` |
| GET | /api/auth/me | any | → `user` |
| PUT | /api/auth/me/language | any | `{language}` → 204 |

## Rides
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | /api/rides/active | Driver | own active (InProgress or Stopped) ride or 204 |
| POST | /api/rides/start | Driver | `{lat,lng,accuracy,odometer,odometerPhoto?}` → ride. 409 if active ride; 400 `no_car`/`no_price` |
| POST | /api/rides/{id}/points | Driver | `[{recordedAt,lat,lng,accuracy}]` → 204 |
| POST | /api/rides/{id}/stop | Driver | `{lat,lng,accuracy,odometer,odometerPhoto?, points?}` → ride with distances & cost |
| POST | /api/rides/{id}/submit | Driver | `{purpose, fees:[{type,amount,photo}]}` → ride (Pending) |
| GET | /api/rides | any | `?status=&month=&driverId=` → list (Driver: own only) |
| GET | /api/rides/{id} | any | detail incl. fees, decision, polyline |
| GET | /api/photos/{id} | any | image bytes (Driver: own rides only) |
| POST | /api/rides/{id}/decide | Manager, Admin | `{approve, comment, distanceSource}`; 409 if not Pending |

Photo fields are base64 data URLs (`data:image/jpeg;base64,...`).

## Dashboard
| GET | /api/dashboard | HR, Manager, Admin | `{serverTime, active[], submissions[], approvedUnpaid[], flagged[]}` |

## Months
| GET | /api/months/{yyyy-MM} | HR, Admin; Driver gets own rows | `{month, closed, closedAt, closedBy, drivers:[{driverId,name,rides,km,fuel,fees,total}], rides[], grandTotal}` |
| POST | /api/months/{yyyy-MM}/close | HR, Admin | → summary; 409 already closed |

## Admin
| GET/POST | /api/admin/users | Admin | create `{username,fullName,role,password}` |
| PUT | /api/admin/users/{id} | Admin | `{fullName,role,isActive,password?}` |
| GET/POST | /api/admin/cars | Admin | `{name,plate,driverId,kmPerLiter}` |
| PUT | /api/admin/cars/{id} | Admin | `{name,plate,driverId,isActive}` |
| POST | /api/admin/cars/{id}/consumption | Admin | `{kmPerLiter,effectiveFrom}` |
| GET/POST | /api/admin/fuel-prices | Admin, HR | `{pricePerLiter,effectiveFrom}` |
| GET/PUT | /api/admin/settings | Admin | `{retentionMonths,mismatchPercent,longRideHours}` |
| GET | /api/admin/storage | Admin | `{databaseBytes,photoBytes,photoCount,pointCount,limitBytes}` |
| POST | /api/admin/cleanup | Admin | → `{photosDeleted,routesCleared}` |
