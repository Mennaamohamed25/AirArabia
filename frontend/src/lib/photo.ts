import imageCompression from 'browser-image-compression'

/** Compresses a photo on the phone to ≤ ~150 KB JPEG (Constitution II) and returns a data URL. */
export async function compressToDataUrl(file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 1280,
    fileType: 'image/jpeg',
    initialQuality: 0.7,
    useWebWorker: false, // the worker would load the library from a CDN
  })
  return imageCompression.getDataUrlFromFile(compressed)
}
