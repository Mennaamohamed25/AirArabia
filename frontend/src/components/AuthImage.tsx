import { useEffect, useState } from 'react'
import { api } from '../api/client'

/** Photos need the bearer token, so they are fetched as blobs instead of plain <img src>. */
export default function AuthImage({ id, alt, className }: { id: number; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let objectUrl: string | null = null
    api<Blob>(`/api/photos/${id}`).then((blob) => {
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }, () => setUrl(null))
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  if (!url) return <div className={`animate-pulse bg-slate-100 ${className}`} />
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={alt} className={className} />
    </a>
  )
}
