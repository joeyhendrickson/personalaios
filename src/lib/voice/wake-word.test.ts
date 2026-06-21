import { describe, expect, it } from 'vitest'
import { containsWakePhrase, extractRemainderAfterWakePhrase } from './wake-word'

describe('containsWakePhrase', () => {
  it('matches common wake phrases', () => {
    expect(containsWakePhrase('hey lifestacks')).toBe(true)
    expect(containsWakePhrase('Hey Life Stacks')).toBe(true)
    expect(containsWakePhrase('hi life stacks')).toBe(true)
    expect(containsWakePhrase('okay life stacks')).toBe(true)
  })

  it('matches common speech-to-text mis-hearings', () => {
    expect(containsWakePhrase('hey live stacks')).toBe(true)
    expect(containsWakePhrase("hey life's stacks")).toBe(true)
    expect(containsWakePhrase('hey lifestack')).toBe(true)
  })

  it('ignores unrelated speech', () => {
    expect(containsWakePhrase('hey there')).toBe(false)
    expect(containsWakePhrase('life is good')).toBe(false)
  })
})

describe('extractRemainderAfterWakePhrase', () => {
  it('returns trailing command text', () => {
    expect(extractRemainderAfterWakePhrase('hey lifestacks what is my budget')).toBe(
      'what is my budget'
    )
  })
})
