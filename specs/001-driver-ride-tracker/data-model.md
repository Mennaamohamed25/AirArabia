# Data Model: Driver Ride Tracker

All timestamps UTC. Money `decimal(10,2)` EGP. Distances `double` km.

## User
| Field | Type | Rules |
|---|---|---|
| Id | int PK | |
| Username | string(50) | unique, required |
| FullName | string(100) | required |
| Role | enum Driver/Manager/HR/Admin | required |
| PasswordHash | string | |
| Language | "en"/"ar" | default "en" |
| IsActive | bool | inactive users cannot log in |

## Car
| Field | Type | Rules |
|---|---|---|
| Id | int PK | |
| Name | string(100) | required |
| Plate | string(30) | required |
| DriverId | int? FK User | one car per driver (role Driver) |
| IsActive | bool | |

## CarConsumption
| CarId FK, KmPerLiter double > 0, EffectiveFrom date |

## FuelPrice
| Id, PricePerLiter decimal > 0, EffectiveFrom date (unique) |

## Ride
| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| DriverId, CarId | FK | |
| Status | enum InProgress, Stopped, Pending, Approved, Rejected, Paid | |
| StartedAt, EndedAt | DateTime | |
| StartLat/Lng, EndLat/Lng | double | |
| StartOdometer, EndOdometer | int km | End > Start |
| StartOdometerPhotoId, EndOdometerPhotoId | int? FK Photo | |
| LastPointAt | DateTime? | for gap/live view |
| LastLat, LastLng | double? | latest position for dashboard |
| GpsKm, OdometerKm, PaidKm | double | |
| DistanceSource | enum Gps/Odometer | default Gps |
| MismatchFlag, GapFlag | bool | mismatch > 15% |
| KmPerLiter, PricePerLiter | snapshot at stop | |
| FuelCost, FeesTotal, Total | decimal | Total = FuelCost + FeesTotal |
| Purpose | string(500) | required to submit |
| RoutePolyline | string? | encoded, cleared by retention |
| PeriodMonth | string "yyyy-MM" | Cairo month of EndedAt; moved forward at close if unapproved |
| SubmittedAt | DateTime? | |

## LocationPoint (temporary)
| Id, RideId FK, RecordedAt, Lat, Lng, Accuracy | deleted when ride stops |

## Fee
| Id, RideId FK, Type enum Parking/Toll/Purchase/Other, Amount decimal 0 < x ≤ 5000, PhotoId FK? |

## Photo
| Id, RideId?, ContentType, Data bytes (≤ 300 KB server limit), CreatedAt |

## Decision
| Id, RideId FK, ManagerId FK, Approved bool, Comment (required if rejected), DistanceSource, DecidedAt |

## MonthPeriod
| Month "yyyy-MM" PK, ClosedAt, ClosedById |

## Setting
| Key PK, Value | keys: RetentionMonths (3), MismatchPercent (15), LongRideHours (12) |

## State transitions

```
InProgress --stop--> Stopped --submit--> Pending --approve--> Approved --month close--> Paid
                                           └--reject--> Rejected
```
- Only the owning driver can stop/submit. Only Pending can be decided (first decision wins).
- Month close: Approved → Paid; Stopped/Pending/InProgress move `PeriodMonth` to next month.

## Derived rules
- FuelCost = round(PaidKm / KmPerLiter × PricePerLiter, 2).
- Recomputed when manager picks distance source; snapshot values never change afterward.
