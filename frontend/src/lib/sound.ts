// Short chimes made with the Web Audio API (no audio files to download).
let ctx: AudioContext | null = null

/** Browsers only allow sound after a user gesture; call this from a click. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* audio not supported */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { once: true })
  window.addEventListener('keydown', unlockAudio, { once: true })
}

const NOTES = {
  start: [523.25, 659.25, 783.99], // rising: C E G
  end: [783.99, 659.25, 523.25], // falling: G E C
  submit: [659.25, 880], // two-tone
}

export function playChime(kind: keyof typeof NOTES) {
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  NOTES[kind].forEach((freq, i) => {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.16
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    osc.connect(gain).connect(ctx!.destination)
    osc.start(t)
    osc.stop(t + 0.4)
  })
}
