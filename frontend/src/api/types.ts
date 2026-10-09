export type Role = 'Driver' | 'Manager' | 'HR'
export type RideStatus = 'InProgress' | 'Stopped' | 'Pending' | 'Approved' | 'Rejected' | 'Paid'
export type DistanceSource = 'Gps' | 'Odometer'
export type FeeType = 'Parking' | 'Toll' | 'Purchase' | 'Other'

export interface User {
  id: number
  email: string
  fullName: string
  role: Role
  language: 'en' | 'ar'
  isActive: boolean
  /** Fuel use of the driver's own car; null = company default. */
  kmPerLiter: number | null
}

export interface Fee {
  id: number
  type: FeeType
  amount: number
  photoId: number | null
}

export interface Decision {
  approved: boolean
  comment: string | null
  distanceSource: DistanceSource
  decidedAt: string
  managerName: string
}

export interface Ride {
  id: number
  status: RideStatus
  driverId: number
  driverName: string
  startedAt: string
  endedAt: string | null
  startLat: number
  startLng: number
  endLat: number | null
  endLng: number | null
  startOdometer: number
  endOdometer: number | null
  startOdometerPhotoId: number | null
  endOdometerPhotoId: number | null
  lastPointAt: string | null
  lastLat: number | null
  lastLng: number | null
  gpsKm: number
  odometerKm: number
  paidKm: number
  distanceSource: DistanceSource
  mismatchFlag: boolean
  gapFlag: boolean
  kmPerLiter: number
  pricePerLiter: number
  fuelCost: number
  feesTotal: number
  total: number
  purpose: string | null
  routePolyline: string | null
  periodMonth: string
  submittedAt: string | null
  fees: Fee[]
  decision: Decision | null
}

export interface DashRow {
  id: number
  status: RideStatus
  driverName: string
  startedAt: string
  endedAt: string | null
  submittedAt: string | null
  lastPointAt: string | null
  lastLat: number | null
  lastLng: number | null
  startLat: number
  startLng: number
  paidKm: number
  total: number
  purpose: string | null
  mismatchFlag: boolean
  gapFlag: boolean
  longRide: boolean
}

export interface Dashboard {
  serverTime: string
  active: DashRow[]
  awaitingSubmit: DashRow[]
  submissions: DashRow[]
  approvedUnpaid: DashRow[]
  flagged: DashRow[]
}

export interface Totals {
  rides: number
  km: number
  fuel: number
  fees: number
  total: number
}

export interface MonthSummary {
  month: string
  closed: boolean
  closedAt: string | null
  closedBy: string | null
  drivers: (Totals & { driverId: number; name: string })[]
  rides: Ride[]
  unapprovedCount: number
  grandTotal: Totals
}

export interface FuelPrice {
  id: number
  pricePerLiter: number
  effectiveFrom: string
}

export interface Settings {
  retentionMonths: number
  mismatchPercent: number
  longRideHours: number
  defaultKmPerLiter: number
}

export interface Storage {
  databaseBytes: number
  photoBytes: number
  photoCount: number
  pointCount: number
  rideCount: number
  limitBytes: number
}

export interface GeoFix {
  recordedAt: string
  lat: number
  lng: number
  accuracy: number
}
