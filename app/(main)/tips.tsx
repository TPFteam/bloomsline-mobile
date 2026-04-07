import { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, ScrollView } from 'react-native'
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
  { bg: '#4A9A86', en: { question: 'How long does a moment take?', optionA: 'Less than 30 seconds', optionB: 'At least 5 minutes', correct: 'a', feedback: "Yep! A quick tap — one word, one photo, one voice note. Done.", wrongFeedback: "Way less! Under 30 seconds. It's a tap, not a thesis." }, fr: { question: 'Ça prend combien de temps, un moment ?', optionA: 'Moins de 30 secondes', optionB: 'Au moins 5 minutes', correct: 'a', feedback: "Exactement ! Un tap rapide — un mot, une photo, un vocal. C'est fait.", wrongFeedback: "Bien moins ! Moins de 30 secondes. C'est un tap, pas une dissertation." } },
  { bg: '#3B82F6', en: { question: 'Tired, happy, meh — does that count?', optionA: 'Nah, only big stuff', optionB: 'Yes, everything counts', correct: 'b', feedback: "Even \"meh\" is a feeling worth capturing. No moment is too small.", wrongFeedback: "It all counts! \"Tired\" is just as real as \"amazing\"." }, fr: { question: 'Fatigué, content, bof — ça compte ?', optionA: 'Non, que les gros trucs', optionB: 'Oui, tout compte', correct: 'b', feedback: "Même « bof » est un ressenti qui mérite d'être capturé. Aucun moment n'est trop petit.", wrongFeedback: "Tout compte ! « Fatigué » est aussi vrai que « incroyable »." } },
  { bg: '#8B5CF6', en: { question: "What's the laziest way to capture a moment?", optionA: 'Write an essay', optionB: 'Snap a photo or say one word', correct: 'b', feedback: "Exactly. A messy desk photo, a 10-second voice note, or literally just \"calm\". That's it.", wrongFeedback: "No essays needed! A photo or one word is a perfect moment." }, fr: { question: "C'est quoi la façon la plus simple de capturer ?", optionA: 'Écrire un roman', optionB: 'Prendre une photo ou dire un mot', correct: 'b', feedback: "Exactement. Une photo de votre café, un vocal de 10 secondes, ou juste « calme ». C'est tout.", wrongFeedback: "Pas besoin de roman ! Une photo ou un mot, c'est un moment parfait." } },
  { bg: '#F97316', en: { question: 'How often is too often?', optionA: 'Once a week is enough', optionB: '2-3 times a day is the sweet spot', correct: 'b', feedback: "Morning, lunch, evening. Three tiny check-ins = one clear picture of your day.", wrongFeedback: "Try 2-3 times a day! It takes seconds and changes everything." }, fr: { question: 'Combien de fois, c\'est trop ?', optionA: 'Une fois par semaine suffit', optionB: '2-3 fois par jour, c\'est idéal', correct: 'b', feedback: "Matin, midi, soir. Trois petits check-ins = une image claire de votre journée.", wrongFeedback: "Essayez 2-3 fois par jour ! Ça prend quelques secondes et ça change tout." } },
  { bg: '#F43F5E', en: { question: 'Only bad days count, right?', optionA: 'Nope, good days too', optionB: 'Yeah, only the hard stuff', correct: 'a', feedback: "Plot twist: we forget the good stuff faster than the bad. Capture both.", wrongFeedback: "The good stuff matters too! We forget calm faster than stress." }, fr: { question: 'Que les mauvais jours comptent, non ?', optionA: 'Non, les bons aussi', optionB: 'Oui, que les moments difficiles', correct: 'a', feedback: "Plot twist : on oublie le positif plus vite que le négatif. Capturez les deux.", wrongFeedback: "Le positif compte aussi ! On oublie le calme plus vite que le stress." } },
]

const MOMENTS_WHY: QuizSlide[] = [
  { bg: '#2D5F8A', en: { question: 'What if you could see your week in feelings?', optionA: 'Patterns start to appear', optionB: 'Nothing really changes', correct: 'a', feedback: "After a few days, you start seeing what lifts you up and what drags you down. It's like a mirror you didn't know you needed.", wrongFeedback: "Something magical happens! Patterns emerge — and they're eye-opening." }, fr: { question: 'Et si vous pouviez voir votre semaine en émotions ?', optionA: 'Des tendances apparaissent', optionB: 'Rien ne change vraiment', correct: 'a', feedback: "Après quelques jours, vous voyez ce qui vous porte et ce qui vous pèse. Comme un miroir dont vous ne soupçonniez pas le besoin.", wrongFeedback: "Quelque chose de magique se produit ! Des tendances apparaissent." } },
  { bg: '#4A9A86', en: { question: 'Who gets to see your stuff?', optionA: 'Only you, unless you decide otherwise', optionB: 'Everyone, automatically', correct: 'a', feedback: "100% private. You're in control. Share only what you want, when you want.", wrongFeedback: "Nobody sees anything unless you say so. Your space, your rules." }, fr: { question: 'Qui voit ce que vous capturez ?', optionA: 'Seulement vous, sauf si vous décidez autrement', optionB: 'Tout le monde, automatiquement', correct: 'a', feedback: "100% privé. Vous gardez le contrôle. Partagez ce que vous voulez, quand vous voulez.", wrongFeedback: "Personne ne voit rien sauf si vous le décidez. Votre espace, vos règles." } },
  { bg: '#8B5CF6', en: { question: "Can't I just... think about it?", optionA: 'Writing it makes it clearer', optionB: "Thinking is enough", correct: 'a', feedback: "Thinking loops. Writing lands. Even one word turns a vague feeling into something you can see and understand.", wrongFeedback: "Thinking helps, but writing makes it real. Try it — you'll feel the difference." }, fr: { question: "Je peux pas juste... y penser ?", optionA: 'L\'écrire rend les choses plus claires', optionB: "Y penser suffit", correct: 'a', feedback: "Penser tourne en boucle. Écrire ancre. Même un mot transforme un ressenti vague en quelque chose de concret.", wrongFeedback: "Penser aide, mais écrire rend les choses réelles. Essayez — vous sentirez la différence." } },
  { bg: '#F43F5E', en: { question: "What's the point of all these dots?", optionA: 'They show how your feelings flow through the day', optionB: "They're just decoration", correct: 'a', feedback: "Each dot is a feeling. Connected, they reveal your rhythm — the ups, the downs, the patterns you didn't see.", wrongFeedback: "Way more than decoration! Each dot is a feeling, and together they tell your story." }, fr: { question: "C'est quoi tous ces points ?", optionA: 'Ils montrent comment vos émotions évoluent dans la journée', optionB: "C'est juste décoratif", correct: 'a', feedback: "Chaque point est un ressenti. Reliés, ils révèlent votre rythme — les hauts, les bas, les tendances invisibles.", wrongFeedback: "Bien plus que de la déco ! Chaque point est un ressenti, et ensemble ils racontent votre histoire." } },
]

const STORIES_HOW: QuizSlide[] = [
  { bg: '#4A9A86', en: { question: "Is this thing private or...?", optionA: 'Everyone can read it', optionB: "Only you, unless you share", correct: 'b', feedback: "Totally private. Always. You decide if and when someone else sees it.", wrongFeedback: "Don't worry — it's private by default. Nobody sees anything unless you want them to." }, fr: { question: "C'est privé ou... ?", optionA: 'Tout le monde peut lire', optionB: "Seulement vous, sauf si vous partagez", correct: 'b', feedback: "Totalement privé. Toujours. C'est vous qui décidez si quelqu'un d'autre voit.", wrongFeedback: "Pas de stress — c'est privé par défaut. Personne ne voit rien sans votre accord." } },
  { bg: '#3B82F6', en: { question: "What do I even write about?", optionA: "Whatever happened today", optionB: "Only deep, meaningful stuff", correct: 'a', feedback: "\"Had a weird dream. Felt off all morning. Coffee helped.\" — that's a story. No pressure.", wrongFeedback: "Start simple! What happened? How did it feel? That's literally all you need." }, fr: { question: "J'écris quoi exactement ?", optionA: "Ce qui s'est passé aujourd'hui", optionB: "Que des trucs profonds et importants", correct: 'a', feedback: "« J'ai fait un rêve bizarre. Me suis senti décalé toute la matinée. Le café a aidé. » — c'est une histoire. Zéro pression.", wrongFeedback: "Commencez simplement ! Que s'est-il passé ? Comment vous vous êtes senti ? C'est tout." } },
  { bg: '#F59E0B', en: { question: "Do I actually have to write?", optionA: "Nope — photo or voice works too", optionB: "Yes, text only", correct: 'a', feedback: "A sunset photo with no caption? A 15-second voice rant? Both are stories. No rules here.", wrongFeedback: "Good news — you don't! A photo, a voice note, or a mix. Your story, your format." }, fr: { question: "Je suis obligé d'écrire ?", optionA: "Non — photo ou vocal ça marche aussi", optionB: "Oui, que du texte", correct: 'a', feedback: "Une photo de coucher de soleil sans légende ? Un vocal de 15 secondes ? Les deux sont des histoires. Pas de règles.", wrongFeedback: "Bonne nouvelle — pas obligé ! Une photo, un vocal, ou un mélange. Votre histoire, votre format." } },
  { bg: '#8B5CF6', en: { question: "Chapters sound serious. Are they?", optionA: "Not at all — they're just folders for your thoughts", optionB: "Yes, very structured and mandatory", correct: 'a', feedback: "Think playlists, not textbooks. \"Things that made me smile\", \"Letters to future me\". Totally optional, totally yours.", wrongFeedback: "Zero pressure! Chapters are just a way to group things. Use them or don't — up to you." }, fr: { question: "Les chapitres, c'est sérieux ?", optionA: "Pas du tout — ce sont juste des dossiers pour vos pensées", optionB: "Oui, très structurés et obligatoires", correct: 'a', feedback: "Pensez playlists, pas manuels scolaires. « Ce qui m'a fait sourire », « Lettres à mon futur moi ». Totalement optionnel.", wrongFeedback: "Zéro pression ! Les chapitres sont juste un moyen de regrouper. Utilisez-les ou pas — c'est vous qui voyez." } },
]

const STORIES_WHY: QuizSlide[] = [
  { bg: '#2D5F8A', en: { question: "Does writing actually do anything?", optionA: "Not really, it's just words", optionB: "It helps you process what you feel", correct: 'b', feedback: "Science agrees: naming an emotion reduces its intensity. Writing isn't journaling — it's self-care in disguise.", wrongFeedback: "It actually does! Putting feelings into words makes them smaller and clearer. Try it once." }, fr: { question: "Écrire, ça sert vraiment à quelque chose ?", optionA: "Pas vraiment, ce sont juste des mots", optionB: "Ça aide à digérer ce qu'on ressent", correct: 'b', feedback: "La science le confirme : nommer une émotion réduit son intensité. Écrire n'est pas du journaling — c'est du self-care déguisé.", wrongFeedback: "Ça marche vraiment ! Mettre des mots sur ses émotions les rend plus petites et plus claires." } },
  { bg: '#4A9A86', en: { question: "What if I'm not ready to share?", optionA: "Then don't — it's your space", optionB: "You have to share everything", correct: 'a', feedback: "Some stories are just for you. Others become powerful when shared with your practitioner. But always on your terms.", wrongFeedback: "Never forced! Your stories are yours. Share when — and if — it feels right." }, fr: { question: "Et si je ne suis pas prêt à partager ?", optionA: "Alors ne partagez pas — c'est votre espace", optionB: "Il faut tout partager", correct: 'a', feedback: "Certaines histoires sont juste pour vous. D'autres deviennent puissantes quand elles sont partagées. Mais toujours à votre rythme.", wrongFeedback: "Jamais forcé ! Vos histoires sont les vôtres. Partagez quand — et si — ça vous semble juste." } },
  { bg: '#F43F5E', en: { question: "Will I actually look back at this?", optionA: "Yes — and you'll be surprised by how far you've come", optionB: "Probably not", correct: 'a', feedback: "Future you will thank present you. Your stories become a mirror of your growth — and that's incredibly powerful.", wrongFeedback: "You will! And when you do, you'll see progress you didn't notice while living it." }, fr: { question: "Est-ce que je vais vraiment relire tout ça ?", optionA: "Oui — et vous serez surpris de votre progression", optionB: "Probablement pas", correct: 'a', feedback: "Votre futur vous remerciera. Vos histoires deviennent un miroir de votre évolution — et c'est incroyablement précieux.", wrongFeedback: "Vous le ferez ! Et vous verrez des progrès que vous n'aviez pas remarqués en les vivant." } },
]

// ─── Quiz Component ─────────────────────────

function Quiz({ slides, onClose }: { slides: QuizSlide[]; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const { locale } = useI18n()
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<'a' | 'b' | null>(null)
  const [score, setScore] = useState(0)
  const [showComplete, setShowComplete] = useState(false)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const answerAnim = useRef(new Animated.Value(0)).current
  const completeFade = useRef(new Animated.Value(0)).current

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
    if (isLast) {
      setShowComplete(true)
      completeFade.setValue(0)
      Animated.timing(completeFade, { toValue: 1, duration: 500, useNativeDriver: true }).start()
      return
    }
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setIndex(i => i + 1)
      setAnswered(null)
      answerAnim.setValue(0)
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start()
    })
  }

  const finalScore = score + (answered === content.correct ? 1 : 0)
  const perfect = finalScore === slides.length

  const completeMessages = {
    en: perfect
      ? { title: "You nailed it!", subtitle: "Every single one. You're ready.", emoji: '🎯' }
      : finalScore >= slides.length * 0.7
        ? { title: "Nice work!", subtitle: "You've got this. Now go try it for real.", emoji: '✨' }
        : { title: "You're learning!", subtitle: "That's the whole point. Come back anytime.", emoji: '🌱' },
    fr: perfect
      ? { title: "Parfait !", subtitle: "Toutes les bonnes réponses. Vous êtes prêt.", emoji: '🎯' }
      : finalScore >= slides.length * 0.7
        ? { title: "Bien joué !", subtitle: "Vous avez compris. Maintenant, essayez pour de vrai.", emoji: '✨' }
        : { title: "Vous apprenez !", subtitle: "C'est le but. Revenez quand vous voulez.", emoji: '🌱' },
  }

  const msg = completeMessages[locale === 'fr' ? 'fr' : 'en']

  if (showComplete) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
        <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, opacity: completeFade, transform: [{ translateY: completeFade.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: perfect ? '#ECFDF5' : finalScore >= slides.length * 0.7 ? '#F0F9FF' : `${colors.bloom}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            {perfect ? <Check size={36} color="#10B981" strokeWidth={2.5} /> : finalScore >= slides.length * 0.7 ? <Sparkles size={36} color="#3B82F6" strokeWidth={1.5} /> : <Heart size={36} color={colors.bloom} strokeWidth={1.5} />}
          </View>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 12 }}>
            {msg.title}
          </Text>
          <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 24, marginBottom: 8 }}>
            {msg.subtitle}
          </Text>
          <Text style={{ fontSize: 14, color: '#CCC', marginBottom: 40 }}>
            {finalScore}/{slides.length} ✓
          </Text>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{ width: '100%', height: 56, borderRadius: 28, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>
              {locale === 'fr' ? "C'est parti" : "Let's go"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    )
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

  const pageFade = useRef(new Animated.Value(0)).current
  useState(() => {
    Animated.timing(pageFade, { toValue: 1, duration: 400, useNativeDriver: true }).start()
  })

  if (activeQuiz === 'how') return <Quiz slides={howSlides} onClose={() => setActiveQuiz(null)} />
  if (activeQuiz === 'why') return <Quiz slides={whySlides} onClose={() => setActiveQuiz(null)} />

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingTop: insets.top, opacity: pageFade }}>
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 15, color: '#888', lineHeight: 22, textAlign: 'center', marginBottom: 24 }}>
          {isStories
            ? (locale === 'fr' ? 'Découvrez comment tirer le meilleur de vos histoires.' : 'Discover how to get the most from your stories.')
            : (locale === 'fr' ? 'Découvrez comment capturer vos moments.' : 'Discover how to capture your moments.')}
        </Text>

        {/* What are stories/moments — explainer */}
        {isStories && (
          <View style={{ marginBottom: 24 }}>
            <View style={{
              backgroundColor: '#fff', borderRadius: 20, padding: 20,
              borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 12,
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 6 }}>
                {locale === 'fr' ? "Qu'est-ce qu'une histoire ?" : 'What is a story?'}
              </Text>
              <Text style={{ fontSize: 13, color: '#888', lineHeight: 20 }}>
                {locale === 'fr'
                  ? 'Un espace pour écrire ce que vous ressentez, ce que vous vivez, ou ce dont vous voulez vous souvenir. Texte, photo, vocal — il n\'y a pas de règles.'
                  : "A space to write what you feel, what you're going through, or what you want to remember. Text, photo, voice — there are no rules."}
              </Text>
            </View>
            <View style={{
              backgroundColor: '#fff', borderRadius: 20, padding: 20,
              borderWidth: 1, borderColor: '#F0F0F0',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 6 }}>
                {locale === 'fr' ? "Et les chapitres ?" : 'What are chapters?'}
              </Text>
              <Text style={{ fontSize: 13, color: '#888', lineHeight: 20 }}>
                {locale === 'fr'
                  ? 'Regroupez vos histoires par ce qui compte pour vous. Comme des playlists, mais pour vos pensées. Vos thèmes, à votre façon.'
                  : "Group your stories by what matters to you. Like playlists, but for your thoughts. Your themes, your way."}
              </Text>
            </View>
          </View>
        )}

        {!isStories && (
          <View style={{ marginBottom: 24 }}>
            <View style={{
              backgroundColor: '#fff', borderRadius: 20, padding: 20,
              borderWidth: 1, borderColor: '#F0F0F0',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 6 }}>
                {locale === 'fr' ? "Qu'est-ce qu'un moment ?" : 'What is a moment?'}
              </Text>
              <Text style={{ fontSize: 13, color: '#888', lineHeight: 20 }}>
                {locale === 'fr'
                  ? 'Un moment, c\'est capturer ce que vous ressentez en quelques secondes — un mot, une photo, un vocal. Au fil du temps, ces moments dessinent votre parcours émotionnel.'
                  : "A moment is capturing how you feel in a few seconds — a word, a photo, a voice note. Over time, these moments build your emotional journey."}
              </Text>
            </View>
          </View>
        )}

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
      </ScrollView>
    </Animated.View>
  )
}
