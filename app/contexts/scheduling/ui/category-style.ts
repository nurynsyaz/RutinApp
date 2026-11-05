import type { Category } from '../domain/routine'

// The card colour of each category (blueprint S-04). The class names are written out in full so
// Tailwind can find them.
export const CATEGORY_STYLE: Record<Category, { card: string }> = {
  health: { card: 'bg-health-soft' },
  work: { card: 'bg-work-soft' },
  personal: { card: 'bg-personal-soft' },
  rest: { card: 'bg-rest-soft' },
}
