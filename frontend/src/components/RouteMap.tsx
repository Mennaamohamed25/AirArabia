import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import { decodePolyline } from '../lib/geo'

function Fit({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap()
  const key = JSON.stringify(bounds)
  useEffect(() => {
    map.fitBounds(JSON.parse(key), { padding: [30, 30], maxZoom: 16 })
  }, [map, key])
  return null
}

export interface MapMarker {
  lat: number
  lng: number
  label: string
  color?: string
  /** Always-visible name above the dot (e.g. the driver), so many drivers can be told apart. */
  name?: string
}

const PALETTE = ['#E4002B', '#2563EB', '#16A34A', '#9333EA', '#EA580C', '#0891B2', '#DB2777', '#4F46E5', '#CA8A04', '#0D9488']

/** Stable colour per driver name. */
export function colorFor(key: string) {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** OpenStreetMap map (free, no API key) showing a ride route and/or markers. */
export default function RouteMap({ polyline, markers = [], className = 'h-72' }: {
  polyline?: string | null
  markers?: MapMarker[]
  className?: string
}) {
  const path = useMemo<LatLngExpression[]>(() => (polyline ? decodePolyline(polyline) : []), [polyline])
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const all = [...(path as [number, number][]), ...markers.map((m) => [m.lat, m.lng] as [number, number])]
    return all.length ? all : null
  }, [path, markers])

  return (
    <div className={`overflow-hidden rounded-2xl ring-1 ring-slate-200 ${className}`} data-testid="route-map">
      <MapContainer center={[30.0444, 31.2357]} zoom={11} className="size-full" scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {path.length > 1 && <Polyline positions={path} pathOptions={{ color: '#E4002B', weight: 5, opacity: 0.85 }} />}
        {markers.map((m, i) => (
          <CircleMarker key={i} center={[m.lat, m.lng]} radius={m.name ? 10 : 8}
            pathOptions={{ color: '#fff', weight: 3, fillColor: m.color ?? '#E4002B', fillOpacity: 1 }}>
            {m.name ? (
              <>
                <Tooltip permanent direction="top" offset={[0, -12]} className="driver-label">
                  <span style={{ color: m.color }}>●</span> {m.name}
                </Tooltip>
                <Popup>{m.label}</Popup>
              </>
            ) : <Tooltip>{m.label}</Tooltip>}
          </CircleMarker>
        ))}
        {bounds && <Fit bounds={bounds} />}
      </MapContainer>
    </div>
  )
}
