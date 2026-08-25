import { describe, expect, it } from 'vitest'
import { LIFE_HACK_CATALOG, formatLifeHacksForCoachPrompt } from './catalog'

describe('LIFE_HACK_CATALOG', () => {
  it('lists Sobriety Tracker so it appears in Available Stacks', () => {
    const sobriety = LIFE_HACK_CATALOG.find((module) => module.id === 'sobriety-tracker')
    expect(sobriety).toMatchObject({
      id: 'sobriety-tracker',
      title: 'Sobriety Tracker',
      category: 'Wellness',
    })
  })

  it('recommends Sobriety Tracker when it is not installed', () => {
    const prompt = formatLifeHacksForCoachPrompt(new Set())
    expect(prompt).toContain('Sobriety Tracker')

    const installed = formatLifeHacksForCoachPrompt(new Set(['sobriety-tracker']))
    expect(installed).not.toContain('Sobriety Tracker')
  })
})
