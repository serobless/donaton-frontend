import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 1800, startOnMount = true) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const startedRef = useRef(false)

  function start() {
    if (startedRef.current) return
    startedRef.current = true
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (startOnMount) start()
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  return { value, start }
}
