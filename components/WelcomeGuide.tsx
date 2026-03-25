import { View, Text, TouchableOpacity, Modal } from 'react-native'
import { colors } from '@/lib/theme'

interface WelcomeGuideProps {
  visible: boolean
  onDismiss: () => void
  locale: string
  hasPractitioner: boolean
  practitionerName?: string
  memberFirstName?: string
}

export function WelcomeGuide({ visible, onDismiss, locale, hasPractitioner, practitionerName, memberFirstName }: WelcomeGuideProps) {
  const pName = practitionerName || (locale === 'fr' ? 'Votre praticien' : 'Your practitioner')

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
      }}>
        <View style={{
          backgroundColor: '#fff', borderRadius: 28, width: '100%', maxWidth: 360,
          paddingTop: 40, paddingBottom: 28, paddingHorizontal: 28,
          shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
        }}>
          {/* Emoji */}
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: `${colors.bloom}15`,
            justifyContent: 'center', alignItems: 'center',
            alignSelf: 'center', marginBottom: 24,
          }}>
            <Text style={{ fontSize: 32 }}>👋</Text>
          </View>

          {/* Title */}
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 20 }}>
            {memberFirstName ? (
              <>
                {locale === 'fr' ? 'Bonjour ' : 'Hi '}
                <Text style={{ color: colors.bloom }}>{memberFirstName}</Text>
                {','}
              </>
            ) : (locale === 'fr' ? 'Bienvenue' : 'Welcome')}
          </Text>

          {/* Practitioner invite line */}
          {hasPractitioner && (
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 12 }}>
              {locale === 'fr' ? `${pName} vous a invité ici.` : `${pName} invited you here.`}
            </Text>
          )}

          {/* Description */}
          <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 21, marginBottom: 32 }}>
            {hasPractitioner
              ? (locale === 'fr'
                ? 'Bloomsline est votre espace pour continuer le travail entre les séances. Complétez des exercices, suivez votre progression, et restez connecté avec votre parcours.'
                : 'Bloomsline is your space to continue the work between sessions. Complete exercises, track your progress, and stay connected with your journey.')
              : (locale === 'fr'
                ? 'Votre espace pour observer vos émotions, capturer vos pensées, et voir votre progression au fil du temps.'
                : 'Your space to observe your emotions, capture your thoughts, and see your progress over time.')}
          </Text>

          {/* CTA */}
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.85}
            style={{
              height: 52, borderRadius: 26,
              backgroundColor: colors.primary,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
              {locale === 'fr' ? 'C\'est parti' : 'Let\'s go'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
