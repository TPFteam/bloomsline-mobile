// Intake questions for the "For You" affirmations flow + crisis helplines.
// Answer keys are the contract with the care-app /api/affirmations endpoint
// (topic → theme, state → crisis trigger, need → tone).

export interface IntakeOption {
  key: string
  en: string
  fr: string
}
export interface IntakeQuestion {
  id: 'topic' | 'state' | 'need'
  en: string
  fr: string
  options: IntakeOption[]
  optional?: boolean
}

// The "state" option that means acute distress → routes to crisis support.
export const CRISIS_STATE = 'struggling'

export const INTAKE: IntakeQuestion[] = [
  {
    id: 'topic',
    en: 'What’s on your mind today?',
    fr: 'Qu’avez-vous en tête aujourd’hui ?',
    options: [
      { key: 'anxiety', en: 'Anxiety or stress', fr: 'Anxiété ou stress' },
      { key: 'relationships', en: 'Relationships', fr: 'Relations' },
      { key: 'work', en: 'Work or burnout', fr: 'Travail ou épuisement' },
      { key: 'self_esteem', en: 'Self-esteem', fr: 'Estime de soi' },
      { key: 'grief', en: 'Grief or loss', fr: 'Deuil ou perte' },
      { key: 'sleep', en: 'Rest or sleep', fr: 'Repos ou sommeil' },
      { key: 'not_sure', en: 'Not sure yet', fr: 'Je ne sais pas encore' },
    ],
  },
  {
    id: 'state',
    en: 'How are you feeling right now?',
    fr: 'Comment vous sentez-vous en ce moment ?',
    options: [
      { key: 'ok', en: 'Doing okay', fr: 'Ça va' },
      { key: 'low', en: 'A bit low', fr: 'Un peu bas' },
      { key: 'numb', en: 'Numb or flat', fr: 'Vide ou éteint(e)' },
      { key: CRISIS_STATE, en: 'Really struggling', fr: 'Vraiment en difficulté' },
    ],
  },
  {
    id: 'need',
    en: 'What would help right now?',
    fr: 'Qu’est-ce qui vous aiderait maintenant ?',
    optional: true,
    options: [
      { key: 'calm', en: 'To feel calmer', fr: 'Me sentir plus calme' },
      { key: 'reassurance', en: 'Some reassurance', fr: 'Être rassuré(e)' },
      { key: 'strength', en: 'A little strength', fr: 'Un peu de force' },
      { key: 'hope', en: 'Some hope', fr: 'Un peu d’espoir' },
      { key: 'rest', en: 'Permission to rest', fr: 'La permission de me reposer' },
    ],
  },
]

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
