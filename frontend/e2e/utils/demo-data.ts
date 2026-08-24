/**
 * Presentable fixture pools for e2e specs.
 *
 * The development deployment is a public demo, and pet/health read routes are
 * public, so whatever these specs write is what a demo visitor sees. Drawing
 * from these pools instead of `Test Pet ${Date.now()}` is what keeps the demo
 * looking like a product rather than a robot farm.
 *
 * Names still need to be unique per run — the suite reuses seeded accounts and
 * asserts on what it created — so every helper appends a short suffix. It is
 * four characters of base36, not a 13-digit epoch, so it reads as a tag rather
 * than as machine output.
 *
 * See docs/e2e-ci.md.
 */

const CAT_NAMES = [
  'Minnie',
  'Biscuit',
  'Pumpkin',
  'Saffron',
  'Marlow',
  'Juniper',
  'Pepper',
  'Clementine',
  'Waffles',
  'Bao',
  'Nutmeg',
  'Olive',
  'Tofu',
  'Mochi',
  'Hazel',
  'Barnaby',
] as const

const DOG_NAMES = ['Rusty', 'Poppy', 'Bramble', 'Nori', 'Wilbur', 'Maisie', 'Otto', 'Fern'] as const

const BREEDS = [
  'Domestic Shorthair',
  'Domestic Longhair',
  'Siamese',
  'Tabby',
  'Tuxedo',
  'Calico',
  'Ragdoll',
  'Maine Coon',
] as const

const HEALTH_NOTES = [
  'Bright and alert. Eating well.',
  'Routine check, nothing of concern.',
  'Slight weight gain since last visit, within a healthy range.',
  'Coat in good condition. Claws trimmed.',
  'Vaccination up to date, next due in six months.',
  'A little shy at the clinic but settled quickly.',
] as const

const PET_DESCRIPTIONS = [
  'Sleeps in the laundry basket and supervises all cooking.',
  'Enthusiastic about boxes, suspicious of the vacuum.',
  'Gentle with children, prefers a quiet corner in the evening.',
  'Talkative in the mornings, affectionate once the sun is up.',
  'Enjoys the balcony, comes back in when the kettle boils.',
  'Best friends with the neighbour and their front step.',
] as const

const GROUP_NAMES = [
  'Ha Long Street Cats',
  'Riverside Fosters',
  'Old Quarter Rescue',
  'Sunday Feeding Round',
  'Green Lane Volunteers',
] as const

/** Four characters of base36 — enough for uniqueness, short enough to read. */
export function tag(): string {
  return Math.random().toString(36).slice(2, 6)
}

/**
 * `noUncheckedIndexedAccess` makes an indexed read `T | undefined`, which is
 * correct for a plain array. Requiring a non-empty tuple lets the compiler see
 * that element 0 always exists, so the fallback is real rather than an
 * assertion that silences the check.
 */
type NonEmpty<T> = readonly [T, ...T[]]

function pick<T>(pool: NonEmpty<T>): T {
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]
}

export function petName(species: 'cat' | 'dog' = 'cat'): string {
  const pool: NonEmpty<string> = species === 'dog' ? DOG_NAMES : CAT_NAMES

  return `${pick(pool)} ${tag()}`
}

export function breed(): string {
  return pick(BREEDS)
}

export function petDescription(): string {
  return pick(PET_DESCRIPTIONS)
}

export function healthNote(): string {
  return pick(HEALTH_NOTES)
}

export function groupName(): string {
  return `${pick(GROUP_NAMES)} ${tag()}`
}

/** Healthy adult cat range, one decimal, so charts look plausible. */
export function weightKg(): string {
  return (3.4 + Math.random() * 2.4).toFixed(1)
}

/** An ISO date `daysAgo` in the past, for records that should look recent. */
export function recentDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  return date.toISOString().slice(0, 10)
}

/**
 * Addresses used by registration specs. Real-looking local part, disposable
 * domain, so a stray record in the demo does not read as someone's account.
 */
export function demoEmail(prefix = 'visitor'): string {
  return `${prefix}-${tag()}@demo.catarchy.space`
}
