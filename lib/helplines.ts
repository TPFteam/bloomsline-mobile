// Crisis helplines for the "Need urgent help?" screen. Kept independent of any
// feature so the safety path is always available.

export interface Helpline {
  label: { en: string; fr: string }
  tel: string
  sub: { en: string; fr: string }
}

// Default France/EU crisis lines. Verify / extend before serving other regions.
export const HELPLINES: Helpline[] = [
  {
    label: { en: 'Suicide prevention — 3114', fr: 'Prévention du suicide — 3114' },
    tel: '3114',
    sub: { en: 'Free, 24/7 (France)', fr: 'Gratuit, 24h/24 (France)' },
  },
  {
    label: { en: 'Emergency — 112', fr: 'Urgences — 112' },
    tel: '112',
    sub: { en: 'Europe-wide emergency number', fr: 'Numéro d’urgence européen' },
  },
  {
    label: { en: 'Medical emergency — 15', fr: 'Urgences médicales — 15' },
    tel: '15',
    sub: { en: 'SAMU (France)', fr: 'SAMU (France)' },
  },
]
