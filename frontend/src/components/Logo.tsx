import logoUrl from '../assets/airarabia-logo.webp'

/**
 * Air Arabia wordmark. The source image is white, so on light backgrounds it is drawn as a CSS
 * mask filled with the brand red.
 */
export default function Logo({ white = false, className = 'h-6' }: { white?: boolean; className?: string }) {
  if (white) return <img src={logoUrl} alt="Air Arabia" className={`${className} w-auto`} />
  return (
    <span role="img" aria-label="Air Arabia" className={`inline-block bg-brand-600 ${className}`}
      style={{
        aspectRatio: '235 / 60',
        maskImage: `url(${logoUrl})`,
        WebkitMaskImage: `url(${logoUrl})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }} />
  )
}
