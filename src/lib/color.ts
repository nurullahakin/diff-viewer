// Monaco theme colors only accept hex strings; this lets us author them in HSL instead.
export function hsla(h: number, s: number, l: number, a = 1): string {
  const sN = s / 100
  const lN = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const chroma = sN * Math.min(lN, 1 - lN)
  const f = (n: number) =>
    lN - chroma * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')

  const r = toHex(f(0))
  const g = toHex(f(8))
  const b = toHex(f(4))
  const alpha = toHex(a)

  return `#${r}${g}${b}${alpha}`
}
