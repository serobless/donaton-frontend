import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from './useCountUp'

beforeEach(() => {
  vi.useFakeTimers()
})

describe('useCountUp', () => {
  it('inicia en 0', () => {
    const { result } = renderHook(() => useCountUp(1000, 1000, false))
    expect(result.current.value).toBe(0)
  })

  it('llega al valor target cuando startOnMount es true', async () => {
    const { result } = renderHook(() => useCountUp(500, 100))
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(result.current.value).toBe(500)
  })
})
