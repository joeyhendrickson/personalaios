import { describe, expect, it } from 'vitest'
import { assistantAskedForMoreDetail, userWantsMoreDetail } from './response-length'

describe('userWantsMoreDetail', () => {
  it('detects explicit more-detail requests', () => {
    expect(
      userWantsMoreDetail([
        { role: 'user', content: 'Can you tell me more detail about my goals?' },
      ])
    ).toBe(true)
  })

  it('detects yes after the advisor asked for more detail', () => {
    expect(
      userWantsMoreDetail([
        { role: 'assistant', content: 'Here is a short plan.\n\nWould you like more detail?' },
        { role: 'user', content: 'yes' },
      ])
    ).toBe(true)
  })

  it('does not treat bare yes as more detail without prior prompt', () => {
    expect(userWantsMoreDetail([{ role: 'user', content: 'yes' }])).toBe(false)
  })
})

describe('assistantAskedForMoreDetail', () => {
  it('matches English and Spanish prompts', () => {
    expect(assistantAskedForMoreDetail('Summary here.\n\nWould you like more detail?')).toBe(true)
    expect(assistantAskedForMoreDetail('Resumen.\n\n¿Te gustaría más detalle?')).toBe(true)
  })
})
