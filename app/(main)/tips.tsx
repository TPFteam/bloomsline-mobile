import { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useI18n } from '@/lib/i18n'
import { colors } from '@/lib/theme'
import { X, Check, Sparkles, ArrowRight, Lightbulb, Heart, ChevronLeft } from 'lucide-react-native'

// ─── Quiz Data ─────────────────────────────

interface QuizSlide {
  bg: string
  en: { question: string; optionA: string; optionB: string; correct: 'a' | 'b'; feedback: string; wrongFeedback: string }
  fr: { question: string; optionA: string; optionB: string; correct: 'a' | 'b'; feedback: string; wrongFeedback: string }
}

const MOMENTS_HOW: QuizSlide[] = [
  { bg: '#4A9A86', en: { question: 'How long does it take to capture a moment?', optionA: 'Less than 30 seconds', optionB: 'At least 5 minutes', correct: 'a', feedback: "Just a quick tap — write a word, snap a photo, or leave a voice note.", wrongFeedback: "Actually, less than 30 seconds! It's a quick tap, not a journal entry." }, fr: { question: 'Combien de temps pour capturer un moment ?', optionA: 'Moins de 30 secondes', optionB: 'Au moins 5 minutes', correct: 'a', feedback: "Juste un tap rapide — un mot, une photo, ou un vocal.", wrongFeedback: "En fait, moins de 30 secondes ! C'est un geste rapide." } },
  { bg: '#3B82F6', en: { question: 'What counts as a moment?', optionA: 'Only big events', optionB: 'Any feeling, big or small', correct: 'b', feedback: "Tired, grateful, bored — every feeling counts.", wrongFeedback: "Not just big events! Even \"tired\" captures something real." }, fr: { question: "Qu'est-ce qui compte comme un moment ?", optionA: 'Seulement les grands événements', optionB: 'Tout ressenti, grand ou petit', correct: 'b', feedback: "Fatigué, reconnaissant, ennuyé — chaque ressenti compte.", wrongFeedback: "Pas seulement les grands événements !" } },
  { bg: '#8B5CF6', en: { question: 'What can you use to capture?', optionA: 'Only text', optionB: 'Text, photo, or voice', correct: 'b', feedback: "A photo, a voice note, or just one word. Whatever feels natural.", wrongFeedback: "Photos and voice notes work too!" }, fr: { question: 'Avec quoi capturer un moment ?', optionA: 'Seulement du texte', optionB: 'Texte, photo ou vocal', correct: 'b', feedback: "Une photo, un vocal, ou juste un mot.", wrongFeedback: "Les photos et les vocaux marchent aussi !" } },
  { bg: '#F97316', en: { question: 'How often should you check in?', optionA: 'Once a week', optionB: '2-3 times a day', correct: 'b', feedback: "Morning, afternoon, evening. Small check-ins build a clear picture.", wrongFeedback: "Try 2-3 times a day! Small check-ins make all the difference." }, fr: { question: 'À quelle fréquence faire le point ?', optionA: 'Une fois par semaine', optionB: '2 à 3 fois par jour', correct: 'b', feedback: "Matin, après-midi, soir. De petits points dessinent une image claire.", wrongFeedback: "Essayez 2 à 3 fois par jour !" } },
  { bg: '#F43F5E', en: { question: 'Should you capture good moments too?', optionA: 'Yes, always', optionB: 'No, only hard ones', correct: 'a', feedback: "We notice stress more than calm. Make space for the quiet wins.", wrongFeedback: "Capture the good too! The quiet wins matter." }, fr: { question: 'Faut-il capturer les bons moments ?', optionA: 'Oui, toujours', optionB: 'Non, seulement les difficiles', correct: 'a', feedback: "On remarque plus le stress que le calme. Les petites victoires comptent.", wrongFeedback: "Capturez aussi le positif !" } },
]

const MOMENTS_WHY: QuizSlide[] = [
  { bg: '#1A1A1A', en: { question: 'What happens when you capture moments over time?', optionA: 'You start seeing patterns', optionB: 'Nothing changes', correct: 'a', feedback: "After a few days, you'll see what lifts you up and what drags you down.", wrongFeedback: "Something beautiful happens! Patterns emerge over time." }, fr: { question: 'Que se passe-t-il quand vous capturez sur la durée ?', optionA: 'Vous voyez des tendances', optionB: 'Rien ne change', correct: 'a', feedback: "Après quelques jours, vous verrez ce qui vous porte et ce qui vous pèse.", wrongFeedback: "Quelque chose de beau se produit ! Des tendances apparaissent." } },
  { bg: '#4A9A86', en: { question: 'Can your practitioner see your moments?', optionA: 'Yes, if you choose to share', optionB: 'Yes, automatically', correct: 'a', feedback: "Your moments are private. You decide what to share and when.", wrongFeedback: "Not automatically! Your moments are private. You choose." }, fr: { question: 'Votre praticien peut-il voir vos moments ?', optionA: 'Oui, si vous choisissez', optionB: 'Oui, automatiquement', correct: 'a', feedback: "Vos moments sont privés. Vous décidez quoi partager.", wrongFeedback: "Pas automatiquement ! C'est vous qui choisissez." } },
  { bg: '#8B5CF6', en: { question: 'Why is capturing better than just thinking?', optionA: 'It makes feelings clearer', optionB: "It doesn't matter", correct: 'a', feedback: "Putting a feeling into words — even one word — makes it real.", wrongFeedback: "It makes a big difference! Naming a feeling makes it clearer." }, fr: { question: 'Pourquoi capturer est mieux que juste penser ?', optionA: 'Ça rend les émotions plus claires', optionB: "Ça ne change rien", correct: 'a', feedback: "Mettre un ressenti en mots — même un seul — le rend réel.", wrongFeedback: "Ça fait une vraie différence ! Nommer une émotion la rend plus claire." } },
  { bg: '#F43F5E', en: { question: 'What does your emotional flow show you?', optionA: 'How your feelings change during the day', optionB: 'Just a list of moments', correct: 'a', feedback: "Your emotional flow connects the dots — revealing rhythms you didn't notice.", wrongFeedback: "It's much more! It shows how your feelings change and connect." }, fr: { question: 'Que montre votre fil émotionnel ?', optionA: 'Comment vos émotions changent dans la journée', optionB: 'Juste une liste de moments', correct: 'a', feedback: "Votre fil émotionnel relie les points — révélant des rythmes invisibles.", wrongFeedback: "C'est bien plus ! Il montre comment vos émotions changent et se connectent." } },
]

const STORIES_HOW: QuizSlide[] = [
  { bg: '#4A9A86', en: { question: 'Who can read your stories?', optionA: 'Everyone', optionB: 'Only you, unless you share', correct: 'b', feedback: "Every story is private by default. You choose.", wrongFeedback: "Only you! Every story is private by default." }, fr: { question: 'Qui peut lire vos histoires ?', optionA: 'Tout le monde', optionB: 'Seulement vous, sauf si vous partagez', correct: 'b', feedback: "Chaque histoire est privée par défaut.", wrongFeedback: "Seulement vous ! Chaque histoire est privée." } },
  { bg: '#3B82F6', en: { question: 'What should you write about?', optionA: 'Whatever happened today', optionB: 'Only important events', correct: 'a', feedback: "What happened? How did it make you feel? That's a story.", wrongFeedback: "Start simple! What happened today? That's a story." }, fr: { question: "De quoi écrire ?", optionA: "Ce qui s'est passé aujourd'hui", optionB: 'Seulement les événements importants', correct: 'a', feedback: "Que s'est-il passé ? C'est déjà une histoire.", wrongFeedback: "Commencez simplement !" } },
  { bg: '#F59E0B', en: { question: 'Can a story be just a photo?', optionA: 'Yes, with or without a caption', optionB: 'No, you need to write', correct: 'a', feedback: "A photo, a voice note, or a mix. No rules.", wrongFeedback: "Yes! A photo, a voice note, or text. No rules." }, fr: { question: 'Une histoire peut-elle être juste une photo ?', optionA: 'Oui, avec ou sans légende', optionB: "Non, il faut écrire", correct: 'a', feedback: "Une photo, un vocal, ou un mélange. Pas de règles.", wrongFeedback: "Oui ! Pas de règles." } },
  { bg: '#8B5CF6', en: { question: 'What are chapters for?', optionA: 'Organizing stories by theme', optionB: "They're mandatory", correct: 'a', feedback: "Group stories by theme. Totally optional.", wrongFeedback: "Chapters are optional! They help organize when you want." }, fr: { question: 'À quoi servent les chapitres ?', optionA: 'Organiser par thème', optionB: 'Ils sont obligatoires', correct: 'a', feedback: "Regroupez par thème. Totalement optionnel.", wrongFeedback: "Les chapitres sont optionnels !" } },
]

const STORIES_WHY: QuizSlide[] = [
  { bg: '#1A1A1A', en: { question: 'Why does writing help?', optionA: "It doesn't really", optionB: 'It helps you process feelings', correct: 'b', feedback: "Putting feelings into words makes them clearer.", wrongFeedback: "It actually does! Naming emotions makes them clearer." }, fr: { question: "Pourquoi écrire aide ?", optionA: "Ça n'aide pas vraiment", optionB: 'Ça aide à digérer les émotions', correct: 'b', feedback: "Mettre des mots sur vos émotions les rend plus claires.", wrongFeedback: "Ça aide vraiment !" } },
  { bg: '#4A9A86', en: { question: 'When should you share a story?', optionA: 'When you feel ready', optionB: 'You have to share everything', correct: 'a', feedback: "Some stories are powerful when shared. But only when you're ready.", wrongFeedback: "Only when you're ready! You're always in control." }, fr: { question: 'Quand partager une histoire ?', optionA: 'Quand vous vous sentez prêt', optionB: 'Il faut tout partager', correct: 'a', feedback: "Certaines histoires sont précieuses quand elles sont partagées. Mais seulement quand vous êtes prêt.", wrongFeedback: "Seulement quand vous êtes prêt !" } },
  { bg: '#F43F5E', en: { question: 'What makes stories powerful over time?', optionA: 'You can look back and see how far you\'ve come', optionB: 'Nothing special', correct: 'a', feedback: "Your stories become a mirror of your growth. That's incredibly valuable.", wrongFeedback: "Actually, looking back at your journey reveals growth you didn't notice!" }, fr: { question: 'Pourquoi les histoires deviennent puissantes avec le temps ?', optionA: 'Vous pouvez voir votre progression', optionB: 'Rien de spécial', correct: 'a', feedback: "Vos histoires deviennent un miroir de votre évolution.", wrongFeedback: "En fait, relire votre parcours révèle une croissance invisible !" } },
]

// ─── Quiz Component ─────────────────────────

function Quiz({ slides, onClose }: { slides: QuizSlide[]; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const { locale } = useI18n()
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<'a' | 'b' | null>(null)
  const [score, setScore] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const answerAnim = useRef(new Animated.Value(0)).current

  const slide = slides[index]
  const content = locale === 'fr' ? slide.fr : slide.en
  const isLast = index === slides.length - 1
  const isCorrect = answered === content.correct

  const handleAnswer = (choice: 'a' | 'b') => {
    if (answered) return
    setAnswered(choice)
    if (choice === content.correct) setScore(s => s + 1)
    answerAnim.setValue(0)
    Animated.spring(answerAnim, { toValue: 1, friction: 10, tension: 40, useNativeDriver: true }).start()
  }

  const handleNext = () => {
    if (isLast) { onClose(); return }
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setIndex(i => i + 1)
      setAnswered(null)
      answerAnim.setValue(0)
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start()
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: slide.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
          <X size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 16, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <View style={{ width: `${((index + (answered ? 1 : 0)) / slides.length) * 100}%`, height: 4, borderRadius: 2, backgroundColor: '#fff' }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Sparkles size={14} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{score}</Text>
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, paddingHorizontal: 24, justifyContent: 'center' }}>
        <Animated.Text style={{
          fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 34, marginBottom: 32, textAlign: 'center',
          transform: [{ translateY: answered ? answerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) : 0 }],
        }}>
          {content.question}
        </Animated.Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['a', 'b'] as const).map((choice) => {
            const text = choice === 'a' ? content.optionA : content.optionB
            const isThis = answered === choice
            const isRight = choice === content.correct
            const showResult = answered !== null
            return (
              <TouchableOpacity key={choice} onPress={() => handleAnswer(choice)} activeOpacity={0.85} disabled={answered !== null}
                style={{ flex: 1, backgroundColor: showResult ? isRight ? '#fff' : 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 20, minHeight: 150, justifyContent: 'space-between', shadowColor: showResult && isRight ? '#000' : 'transparent', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: showResult && isRight ? 8 : 0 }}>
                {showResult ? (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isRight ? '#10B981' : isThis ? '#EF4444' : 'transparent', justifyContent: 'center', alignItems: 'center', alignSelf: choice === 'a' ? 'flex-start' : 'flex-end' }}>
                    {isRight && <Check size={20} color="#fff" strokeWidth={3} />}
                    {isThis && !isRight && <X size={20} color="#fff" strokeWidth={3} />}
                  </View>
                ) : <View style={{ height: 36 }} />}
                <Text style={{ fontSize: 17, fontWeight: '700', color: showResult && isRight ? '#1A1A1A' : '#fff', lineHeight: 23 }}>{text}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {answered && (
          <Animated.View style={{
            marginTop: 24, flexDirection: 'row', alignItems: 'flex-start', gap: 8,
            opacity: answerAnim,
            transform: [{ translateY: answerAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}>
            <Sparkles size={16} color="rgba(255,255,255,0.6)" style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#fff' }}>
                {isCorrect ? (locale === 'fr' ? 'Bien joué ! ' : 'Nice! ') : (locale === 'fr' ? 'Pas tout à fait. ' : 'Not exactly. ')}
              </Text>
              {isCorrect ? content.feedback : content.wrongFeedback}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {answered && (
        <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, flexDirection: 'row', gap: 12 }}>
          {!isCorrect && (
            <TouchableOpacity onPress={() => setAnswered(null)} activeOpacity={0.85}
              style={{ height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{locale === 'fr' ? 'Réessayer' : 'Try again'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleNext} activeOpacity={0.85}
            style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: slide.bg }}>
              {isLast ? (locale === 'fr' ? 'Terminé !' : 'Done!') : (locale === 'fr' ? 'Continuer' : 'Continue')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ─── Landing Page ─────────────────────────

export default function Tips() {
  const router = useRouter()
  const { context } = useLocalSearchParams<{ context?: string }>()
  const isStories = context === 'stories'
  const insets = useSafeAreaInsets()
  const { locale } = useI18n()

  const [activeQuiz, setActiveQuiz] = useState<'how' | 'why' | null>(null)

  const howSlides = isStories ? STORIES_HOW : MOMENTS_HOW
  const whySlides = isStories ? STORIES_WHY : MOMENTS_WHY

  if (activeQuiz === 'how') return <Quiz slides={howSlides} onClose={() => setActiveQuiz(null)} />
  if (activeQuiz === 'why') return <Quiz slides={whySlides} onClose={() => setActiveQuiz(null)} />

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(main)/home')} activeOpacity={0.7}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
          <ChevronLeft size={20} color="#000" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
          {locale === 'fr' ? 'Conseils pour vous' : 'Tips for you'}
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, color: '#888', lineHeight: 22, textAlign: 'center', marginBottom: 32 }}>
          {isStories
            ? (locale === 'fr' ? 'Découvrez comment tirer le meilleur de vos histoires.' : 'Discover how to get the most from your stories.')
            : (locale === 'fr' ? 'Découvrez comment capturer vos moments.' : 'Discover how to capture your moments.')}
        </Text>

        {/* How it works card */}
        <TouchableOpacity
          onPress={() => setActiveQuiz('how')}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.bloom,
            borderRadius: 24,
            padding: 28,
            marginBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <Lightbulb size={24} color="#fff" strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 }}>
              {locale === 'fr' ? 'Comment ça marche' : 'How it works'}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              {isStories
                ? (locale === 'fr' ? 'Les bases pour bien commencer' : 'The basics to get started')
                : (locale === 'fr' ? 'Apprenez à capturer en quelques taps' : 'Learn to capture in a few taps')}
            </Text>
          </View>
          <ArrowRight size={22} color="#fff" />
        </TouchableOpacity>

        {/* Why it matters card */}
        <TouchableOpacity
          onPress={() => setActiveQuiz('why')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#2D5F8A',
            borderRadius: 24,
            padding: 28,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
            <Heart size={24} color="#fff" strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 }}>
              {locale === 'fr' ? 'Pourquoi c\'est puissant' : 'Why it matters'}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {isStories
                ? (locale === 'fr' ? 'Ce que l\'écriture change vraiment' : 'What writing actually changes')
                : (locale === 'fr' ? 'Ce qui se passe quand vous continuez' : 'What happens when you keep going')}
            </Text>
          </View>
          <ArrowRight size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  )
}
