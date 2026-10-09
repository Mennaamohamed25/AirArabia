import { api, ApiError } from '../api/client'
import type { GeoFix } from '../api/types'
import { haversineKm } from './geo'

const INTERVAL = Number(import.meta.env.VITE_GPS_INTERVAL_MS ?? 25000)
const GAP_MS = 2 * 60 * 1000
const MAX_ACCURACY = 50

export type GpsState = 'waiting' | 'ok' | 'gap' | 'denied'

export interface TrackerStatus {
  gps: GpsState
  liveKm: number
  queued: number
}

const queueKey = (rideId: number) => `rt.queue.${rideId}`

function readQueue(rideId: number): GeoFix[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey(rideId)) ?? '[]')
  } catch {
    return []
  }
}

function writeQueue(rideId: number, q: GeoFix[]) {
  try {
    if (q.length) localStorage.setItem(queueKey(rideId), JSON.stringify(q))
    else localStorage.removeItem(queueKey(rideId))
  } catch {
    /* storage unavailable: points stay in memory */
  }
}

export function toFix(p: GeolocationPosition): GeoFix {
  return {
    recordedAt: new Date(p.timestamp || Date.now()).toISOString(),
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    accuracy: p.coords.accuracy,
  }
}

export function currentPosition(timeoutMs = 15000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'))
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 10000,
    })
  })
}

/**
 * Records GPS fixes during a ride (Constitution III): keeps the screen awake, stores fixes
 * in localStorage while offline, and reports a gap when no fix arrives for 2 minutes.
 */
export class RideTracker {
  private watchId: number | null = null
  private timer: number | null = null
  private wakeLock: WakeLockSentinel | null = null
  private latest: GeoFix | null = null
  private lastRecorded: GeoFix | null = null
  private lastFixAt = Date.now()
  private queue: GeoFix[]
  private flushing = false
  private liveKm = 0
  private denied = false
  private readonly rideId: number
  private readonly onStatus: (s: TrackerStatus) => void

  constructor(rideId: number, onStatus: (s: TrackerStatus) => void) {
    this.rideId = rideId
    this.onStatus = onStatus
    this.queue = readQueue(rideId)
  }

  start() {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (p) => this.onFix(toFix(p)),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) this.denied = true
          this.emit()
        },
        { enableHighAccuracy: true, maximumAge: 5000 },
      )
    }
    this.timer = window.setInterval(() => this.tick(), INTERVAL)
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('online', this.onOnline)
    void this.lockScreen()
    this.emit()
  }

  /** Stops tracking and returns fixes that were not uploaded yet (sent with the stop request). */
  stop(): GeoFix[] {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId)
    if (this.timer !== null) clearInterval(this.timer)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('online', this.onOnline)
    void this.wakeLock?.release().catch(() => {})
    this.wakeLock = null
    const pending = [...this.queue]
    if (this.latest && this.latest !== this.lastRecorded) pending.push(this.latest)
    return pending
  }

  clearQueue() {
    this.queue = []
    writeQueue(this.rideId, [])
  }

  private onFix(fix: GeoFix) {
    this.latest = fix
    this.lastFixAt = Date.now()
    this.denied = false
    if (!this.lastRecorded) this.record(fix)
    this.emit()
  }

  private tick() {
    if (this.latest && this.latest !== this.lastRecorded) this.record(this.latest)
    else currentPosition(INTERVAL).then((p) => this.onFix(toFix(p)), () => this.emit())
    void this.flush()
    this.emit()
  }

  private record(fix: GeoFix) {
    if (fix.accuracy <= MAX_ACCURACY && this.lastRecorded) this.liveKm += haversineKm(this.lastRecorded, fix)
    if (fix.accuracy <= MAX_ACCURACY || !this.lastRecorded) this.lastRecorded = fix
    this.queue.push(fix)
    writeQueue(this.rideId, this.queue)
  }

  async flush() {
    if (this.flushing || this.queue.length === 0) return
    this.flushing = true
    const batch = this.queue.slice(0, 500)
    try {
      await api(`/api/rides/${this.rideId}/points`, { method: 'POST', json: batch })
      this.queue = this.queue.slice(batch.length)
      writeQueue(this.rideId, this.queue)
    } catch (e) {
      // Ride no longer in progress: drop the queue; otherwise keep it for the next try.
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) this.clearQueue()
    } finally {
      this.flushing = false
      this.emit()
    }
  }

  private emit() {
    const gps: GpsState = this.denied
      ? 'denied'
      : Date.now() - this.lastFixAt > GAP_MS
        ? 'gap'
        : this.latest
          ? 'ok'
          : 'waiting'
    this.onStatus({ gps, liveKm: this.liveKm, queued: this.queue.length })
  }

  private async lockScreen() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible')
        this.wakeLock = await navigator.wakeLock.request('screen')
    } catch {
      /* not supported or refused */
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void this.lockScreen()
      this.tick()
    }
  }

  private onOnline = () => void this.flush()
}
