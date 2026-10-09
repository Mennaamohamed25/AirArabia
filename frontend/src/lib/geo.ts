/** Google encoded polyline decoder (precision 5) — matches the backend encoder. */
export function decodePolyline(encoded: string): [number, number][] {
  const out: [number, number][] = []
  let i = 0
  let lat = 0
  let lng = 0
  const read = () => {
    let result = 0
    let shift = 0
    let b: number
    do {
      b = encoded.charCodeAt(i++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }
  while (i < encoded.length) {
    lat += read()
    lng += read()
    out.push([lat / 1e5, lng / 1e5])
  }
  return out
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371.0088
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
