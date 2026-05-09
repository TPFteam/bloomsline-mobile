/**
 * Pull-to-refresh micro-affirmations.
 *
 * Single, gentle, low-pressure phrase shown at the top of a screen while
 * the user pulls to refresh — same idea as Slack's "If anyone can, it's
 * you" / "You're doing great work". Tailored for the Bloomsline audience
 * (therapy patients) so phrases lean encouraging without being saccharine
 * or self-help-cliché.
 *
 * Keep entries short (3-7 words) so they read instantly during the pull.
 */

type Locale = 'en' | 'fr' | 'es' | string

const AFFIRMATIONS: Record<'en' | 'fr' | 'es', string[]> = {
  en: [
    "You're doing great work",
    "If anyone can, it's you",
    "Small steps still count",
    "Be gentle with yourself",
    "Progress isn't always linear",
    "One breath at a time",
    'You showed up. That matters.',
    "There's no rush here",
    'Today is enough',
    'Healing has its own rhythm',
    "It's okay to slow down",
    'You are not alone',
    "What's hard now will pass",
    'Showing up is the work',
  ],
  fr: [
    'Vous faites de votre mieux',
    "Si quelqu'un peut le faire, c'est vous",
    'Les petits pas comptent aussi',
    'Soyez doux avec vous-même',
    "Le progrès n'est pas linéaire",
    'Une respiration à la fois',
    "Vous êtes là. C'est important.",
    'Rien ne presse',
    "Aujourd'hui suffit",
    'La guérison a son propre rythme',
    "C'est ok de ralentir",
    "Vous n'êtes pas seul·e",
    'Ce qui est dur passera',
    'Être présent·e, c’est déjà beaucoup',
  ],
  es: [
    'Estás haciendo un gran trabajo',
    'Si alguien puede, eres tú',
    'Los pequeños pasos también cuentan',
    'Sé amable contigo mismo/a',
    'El progreso no es lineal',
    'Una respiración a la vez',
    'Llegaste aquí. Eso importa.',
    'No hay prisa',
    'Hoy es suficiente',
    'La sanación tiene su propio ritmo',
    'Está bien ir despacio',
    'No estás solo/a',
    'Lo difícil también pasa',
    'Aparecer ya es mucho',
  ],
}

/**
 * Pick a random affirmation for the given locale. Falls back to English
 * for any locale we haven't translated. Stable across the call but the
 * caller decides when to re-pick (typically once per refresh trigger).
 */
export function pickAffirmation(locale: Locale): string {
  const list =
    locale === 'fr' ? AFFIRMATIONS.fr :
    locale === 'es' ? AFFIRMATIONS.es :
    AFFIRMATIONS.en
  return list[Math.floor(Math.random() * list.length)]
}
