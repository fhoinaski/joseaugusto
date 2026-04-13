export function vibrateSoft(pattern: number | number[] = 18): void {
  if (typeof navigator === 'undefined') return
  if (!('vibrate' in navigator)) return
  navigator.vibrate(pattern)
}

export function emitToast(text: string, thumb?: string, duration = 3200): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('cha:toast', { detail: { text, thumb, duration } }))
}
