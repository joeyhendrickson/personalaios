/**
 * Original recovery principles that reinforce the Twelve Steps of AA.
 * These are not the copyrighted AA World Services step text.
 * Alcoholics Anonymous is independent of Lifestacks.
 */

export type RecoveryPrinciple = {
  number: number
  title: string
  summary: string
  practice: string
}

export const AA_DISCLAIMER =
  'Alcoholics Anonymous® is independent of Lifestacks. These are original reflections that reinforce the spirit of the Twelve Steps — not official AA literature. For meetings and the official steps, visit aa.org.'

export const RECOVERY_PRINCIPLES: RecoveryPrinciple[] = [
  {
    number: 1,
    title: 'Honest admission',
    summary:
      'Recovery starts by telling the truth: alcohol has more power in your life than you want it to. Naming that clearly is strength, not failure.',
    practice: 'Today, say out loud one way drinking has cost you control, health, money, or trust.',
  },
  {
    number: 2,
    title: 'Hope beyond willpower alone',
    summary:
      'White-knuckling is exhausting. Healing often needs a source of hope larger than a single day’s resolve — community, faith, or a power you choose to trust.',
    practice: 'Name one person, meeting, or practice you can lean on when willpower thins.',
  },
  {
    number: 3,
    title: 'A decision to stop steering alone',
    summary:
      'You do not have to manage every craving by yourself. Turning your next choice over to a trusted path — a sponsor, a meeting, a higher power — is a daily decision.',
    practice: 'Before a high-risk hour, decide who or what you will consult instead of the drink.',
  },
  {
    number: 4,
    title: 'A fearless look inward',
    summary:
      'Inventory is not self-punishment. It is a clear map of patterns, resentments, and fears so they stop running the show in the dark.',
    practice: 'Write one pattern that shows up before you drink, without justifying it.',
  },
  {
    number: 5,
    title: 'Telling another person the truth',
    summary:
      'Shame shrinks when it is spoken to a trusted listener. Secrets about drinking keep the cycle alive.',
    practice: 'Share one honest sentence with a sponsor, meeting, or I Am Present session.',
  },
  {
    number: 6,
    title: 'Willingness to let harmful habits go',
    summary:
      'Seeing a defect is not the same as clinging to it. Willingness is the pause where you stop defending the old way.',
    practice:
      'Pick one habit that feeds drinking (isolation, a bar, a story) and name being willing to release it.',
  },
  {
    number: 7,
    title: 'Asking for help with humility',
    summary:
      'Humility is not humiliation. It is asking for the character you cannot manufacture on demand.',
    practice: 'Ask for help with one specific craving or character trait today.',
  },
  {
    number: 8,
    title: 'Owning the harm list',
    summary:
      'Drinking rarely injures only you. Listing people affected — including yourself — prepares repair instead of rumination.',
    practice: 'Add one name to an amends list, including how they were affected.',
  },
  {
    number: 9,
    title: 'Making amends where it heals',
    summary:
      'Repair is action, not apology theater. Direct amends restore trust when they will not cause new harm.',
    practice:
      'If it is safe, take one concrete repair step. If it is not safe, write what a healthy amends would be.',
  },
  {
    number: 10,
    title: 'Daily course-correction',
    summary:
      'Recovery is maintained in small inventories: notice, admit, and reset the same day instead of waiting for a collapse.',
    practice: 'Tonight, note one thing you did well and one thing to correct tomorrow.',
  },
  {
    number: 11,
    title: 'Quiet contact and guidance',
    summary:
      'Prayer, meditation, or present-moment practice keeps you from living only in craving or regret. Guidance is easier to hear when the mind is still.',
    practice: 'Take five quiet minutes. If rumination starts, open I Am Present.',
  },
  {
    number: 12,
    title: 'Living it and offering it',
    summary:
      'A spiritual or practical awakening is kept by using it: stay sober, help someone else, and let the work show in ordinary days.',
    practice: 'Do one sober act that serves someone else, even a small check-in.',
  },
]
