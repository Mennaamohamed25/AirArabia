import * as XLSX from 'xlsx'
import type { MonthSummary } from '../api/types'

const r2 = (n: number) => Math.round(n * 100) / 100

export function exportMonthExcel(s: MonthSummary) {
  const wb = XLSX.utils.book_new()

  const summary = s.drivers.map((d) => ({
    Driver: d.name, Rides: d.rides, 'Distance (km)': r2(d.km), 'Fuel (EGP)': r2(d.fuel), 'Fees (EGP)': r2(d.fees), 'Total (EGP)': r2(d.total),
  }))
  summary.push({
    Driver: 'TOTAL', Rides: s.grandTotal.rides, 'Distance (km)': r2(s.grandTotal.km), 'Fuel (EGP)': r2(s.grandTotal.fuel),
    'Fees (EGP)': r2(s.grandTotal.fees), 'Total (EGP)': r2(s.grandTotal.total),
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary')

  const rides = s.rides.map((r) => ({
    'Ride #': r.id, Driver: r.driverName, Status: r.status,
    Started: new Date(r.startedAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo' }),
    Purpose: r.purpose ?? '', 'GPS km': r.gpsKm, 'Odometer km': r.odometerKm, 'Paid km': r.paidKm, 'Distance source': r.distanceSource,
    'Price/L': r.pricePerLiter, 'km/L': r.kmPerLiter, 'Fuel (EGP)': r.fuelCost, 'Fees (EGP)': r.feesTotal, 'Total (EGP)': r.total,
    'Approved by': r.decision?.managerName ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rides), 'Rides')

  XLSX.writeFile(wb, `rides-${s.month}.xlsx`)
}
