import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useI18n } from '@/lib/i18n'
import { colors } from '@/lib/theme'
import { Camera, Mic, PenLine, Clock, Sparkles, Heart, Sun, Moon, ChevronLeft, BookOpen, Layers, Lock, Share2, Feather } from 'lucide-react-native'

// ─── Moments Tips ─────────────────────────────

const MOMENTS_TIPS = [
  {
    icon: PenLine,
    color: '#10B981',
    bg: '#ECFDF5',
    en: { title: 'One word is enough', body: "You don't need to write a paragraph. Even \"tired\" or \"grateful\" captures something real." },
    fr: { title: 'Un seul mot suffit', body: "Pas besoin d'écrire un paragraphe. Même « fatigué » ou « reconnaissant » capture quelque chose de vrai." },
  },
  {
    icon: Camera,
    color: '#3B82F6',
    bg: '#EFF6FF',
    en: { title: 'A photo is a moment too', body: "Your coffee, the sky, a messy desk — what you see tells how you feel." },
    fr: { title: 'Une photo est aussi un moment', body: "Votre café, le ciel, un bureau en désordre — ce que vous voyez dit comment vous allez." },
  },
  {
    icon: Mic,
    color: '#F59E0B',
    bg: '#FFFBEB',
    en: { title: 'Talk when words are hard', body: "Some feelings are easier to say than type. A 10-second voice note is enough." },
    fr: { title: 'Parlez quand les mots sont durs', body: "Certains ressentis sont plus faciles à dire qu'à écrire. Un vocal de 10 secondes suffit." },
  },
  {
    icon: Clock,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    en: { title: 'Check in 2-3 times a day', body: "Morning, afternoon, evening. Small check-ins build a clear picture of your day." },
    fr: { title: 'Faites le point 2 à 3 fois par jour', body: "Matin, après-midi, soir. De petits points réguliers dessinent une image claire de votre journée." },
  },
  {
    icon: Heart,
    color: '#F43F5E',
    bg: '#FFF1F2',
    en: { title: "There's no wrong moment", body: "Happy, sad, confused, bored — every feeling counts. Don't wait for something big." },
    fr: { title: "Il n'y a pas de mauvais moment", body: "Heureux, triste, confus, ennuyé — chaque ressenti compte. N'attendez pas quelque chose de grand." },
  },
  {
    icon: Sun,
    color: '#F97316',
    bg: '#FFF7ED',
    en: { title: 'Capture the good too', body: "We tend to notice stress more than calm. Make space for the quiet wins." },
    fr: { title: 'Capturez aussi le positif', body: "On remarque plus le stress que le calme. Faites de la place pour les petites victoires." },
  },
]

const MOMENTS_WHY = [
  {
    icon: Sparkles,
    en: { title: 'You start noticing patterns', body: "After a few days, you'll see what lifts you up and what drags you down." },
    fr: { title: 'Vous commencez à voir des tendances', body: "Après quelques jours, vous verrez ce qui vous porte et ce qui vous pèse." },
  },
  {
    icon: Moon,
    en: { title: 'It takes less than 30 seconds', body: "This isn't journaling. It's a quick tap to say \"I was here, I felt this.\"" },
    fr: { title: 'Ça prend moins de 30 secondes', body: "Ce n'est pas un journal intime. C'est un simple geste pour dire « j'étais là, j'ai ressenti ça »." },
  },
]

// ─── Stories Tips ─────────────────────────────

const STORIES_TIPS = [
  {
    icon: Feather,
    color: '#10B981',
    bg: '#ECFDF5',
    en: { title: 'Write like nobody reads', body: "This is your private space. No judgment, no audience. Just you and your thoughts." },
    fr: { title: 'Écrivez comme si personne ne lisait', body: "C'est votre espace privé. Pas de jugement, pas de public. Juste vous et vos pensées." },
  },
  {
    icon: BookOpen,
    color: '#3B82F6',
    bg: '#EFF6FF',
    en: { title: 'Start with what happened today', body: "Don't overthink it. What happened? How did it make you feel? That's a story." },
    fr: { title: 'Commencez par ce qui s\'est passé aujourd\'hui', body: "Ne réfléchissez pas trop. Que s'est-il passé ? Qu'avez-vous ressenti ? C'est une histoire." },
  },
  {
    icon: Layers,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    en: { title: 'Use chapters for big themes', body: "Group related stories into chapters — like \"My anxiety journey\" or \"Things I'm grateful for\"." },
    fr: { title: 'Utilisez les chapitres pour les grands thèmes', body: "Regroupez vos histoires en chapitres — comme « Mon parcours avec l'anxiété » ou « Ce dont je suis reconnaissant »." },
  },
  {
    icon: Camera,
    color: '#F59E0B',
    bg: '#FFFBEB',
    en: { title: 'Add photos and voice', body: "A story can be a photo with a caption, a voice note, or a mix. There are no rules." },
    fr: { title: 'Ajoutez des photos et des vocaux', body: "Une histoire peut être une photo avec une légende, un vocal, ou un mélange. Il n'y a pas de règles." },
  },
  {
    icon: Lock,
    color: '#64748B',
    bg: '#F1F5F9',
    en: { title: 'Keep it private or share it', body: "Every story is private by default. You choose if and when to share it with someone you trust." },
    fr: { title: 'Gardez-le privé ou partagez-le', body: "Chaque histoire est privée par défaut. C'est vous qui choisissez si et quand la partager." },
  },
  {
    icon: Heart,
    color: '#F43F5E',
    bg: '#FFF1F2',
    en: { title: 'Tag your mood', body: "Adding a mood to your story helps you look back and see how your feelings connect to your experiences." },
    fr: { title: 'Ajoutez votre humeur', body: "Ajouter une humeur à votre histoire vous aide à voir comment vos émotions se connectent à vos expériences." },
  },
]

const STORIES_WHY = [
  {
    icon: Sparkles,
    en: { title: 'Writing helps you process', body: "Putting feelings into words makes them clearer. You'll understand yourself better than you think." },
    fr: { title: 'Écrire aide à digérer', body: "Mettre des mots sur vos émotions les rend plus claires. Vous vous comprendrez mieux que vous ne le pensez." },
  },
  {
    icon: Share2,
    en: { title: 'Share when you\'re ready', body: "Some stories are powerful when shared with your practitioner. It gives them real insight into your world." },
    fr: { title: 'Partagez quand vous êtes prêt', body: "Certaines histoires sont précieuses quand elles sont partagées avec votre praticien. Ça lui donne un vrai aperçu de votre monde." },
  },
]

// ─── Shared rendering ─────────────────────────

type TipItem = { icon: any; color: string; bg: string; en: { title: string; body: string }; fr: { title: string; body: string } }
type WhyItem = { icon: any; en: { title: string; body: string }; fr: { title: string; body: string } }

export default function Tips() {
  const router = useRouter()
  const { context } = useLocalSearchParams<{ context?: string }>()
  const isStories = context === 'stories'
  const insets = useSafeAreaInsets()
  const { locale } = useI18n()

  const tips: TipItem[] = isStories ? STORIES_TIPS : MOMENTS_TIPS
  const whyItems: WhyItem[] = isStories ? STORIES_WHY : MOMENTS_WHY

  const intro = isStories
    ? (locale === 'fr'
      ? 'Les histoires sont votre espace pour écrire, réfléchir et grandir. Voici comment en profiter.'
      : 'Stories are your space to write, reflect, and grow. Here\'s how to make the most of it.')
    : (locale === 'fr'
      ? 'Capturer des moments est simple. Voici quelques idées pour en tirer le meilleur.'
      : 'Capturing moments is simple. Here are a few ideas to get the most out of it.')

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}
        >
          <ChevronLeft size={20} color="#000" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
          {locale === 'fr' ? 'Conseils pour vous' : 'Tips for you'}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <Text style={{ fontSize: 15, color: '#888', lineHeight: 22, marginBottom: 28 }}>
          {intro}
        </Text>

        {/* Tips */}
        <View style={{ gap: 12, marginBottom: 36 }}>
          {tips.map((tip, i) => {
            const content = locale === 'fr' ? tip.fr : tip.en
            const Icon = tip.icon
            return (
              <View
                key={i}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  padding: 18,
                  flexDirection: 'row',
                  gap: 14,
                  borderWidth: 1,
                  borderColor: '#F0F0F0',
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: tip.bg,
                  justifyContent: 'center', alignItems: 'center',
                  marginTop: 2,
                }}>
                  <Icon size={20} color={tip.color} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
                    {content.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#888', lineHeight: 19 }}>
                    {content.body}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Why it works */}
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 16 }}>
          {locale === 'fr' ? 'Pourquoi ça marche' : 'Why it works'}
        </Text>

        <View style={{ gap: 12 }}>
          {whyItems.map((item, i) => {
            const content = locale === 'fr' ? item.fr : item.en
            const Icon = item.icon
            return (
              <View
                key={i}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  padding: 18,
                  flexDirection: 'row',
                  gap: 14,
                  borderWidth: 1,
                  borderColor: '#F0F0F0',
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: `${colors.bloom}10`,
                  justifyContent: 'center', alignItems: 'center',
                  marginTop: 2,
                }}>
                  <Icon size={20} color={colors.bloom} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
                    {content.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#888', lineHeight: 19 }}>
                    {content.body}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
