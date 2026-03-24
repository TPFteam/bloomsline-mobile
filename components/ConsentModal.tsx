import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Modal, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Shield, FileText, Lock, Database, ChevronDown, ExternalLink } from 'lucide-react-native'
import { colors } from '@/lib/theme'

const content = {
  en: {
    heading: 'Before you begin...',
    subheading: 'Please review our policies.',
    mvpNotice: 'Bloomsline is currently in early development and testing. These policies will be updated as we finalize our practices before public launch.',
    checkboxLabel: 'I have read and agree to the above policies',
    continueButton: 'Continue',
    readFull: 'Read full policy',
    sections: [
      { key: 'privacy', title: 'Privacy Policy', icon: Shield, intro: 'At Bloomsline, your privacy matters deeply to us. This policy explains how we handle your information.', href: 'https://bloomsline.com/privacy' },
      { key: 'terms', title: 'Terms of Service', icon: FileText, intro: 'Welcome to Bloomsline. By using our service, you agree to these terms. Please read them carefully.', href: 'https://bloomsline.com/terms' },
      { key: 'security', title: 'Security', icon: Lock, intro: 'Your trust is our foundation. We take security seriously and implement robust measures to protect your data.', href: 'https://bloomsline.com/security' },
      { key: 'data-protection', title: 'Data Protection', icon: Database, intro: 'We believe you should have full control over your personal data.', href: 'https://bloomsline.com/data-protection' },
    ],
  },
  fr: {
    heading: 'Avant de commencer...',
    subheading: 'Veuillez consulter nos politiques.',
    mvpNotice: 'Bloomsline est actuellement en développement et en phase de test. Ces politiques seront mises à jour avant le lancement public.',
    checkboxLabel: 'J\'ai lu et j\'accepte les politiques ci-dessus',
    continueButton: 'Continuer',
    readFull: 'Lire la politique complète',
    sections: [
      { key: 'privacy', title: 'Politique de Confidentialité', icon: Shield, intro: 'Chez Bloomsline, votre vie privée nous tient à cœur. Cette politique explique comment nous traitons vos informations.', href: 'https://bloomsline.com/privacy' },
      { key: 'terms', title: 'Conditions d\'Utilisation', icon: FileText, intro: 'Bienvenue sur Bloomsline. En utilisant notre service, vous acceptez ces conditions.', href: 'https://bloomsline.com/terms' },
      { key: 'security', title: 'Sécurité', icon: Lock, intro: 'Votre confiance est notre fondement. Nous prenons la sécurité au sérieux.', href: 'https://bloomsline.com/security' },
      { key: 'data-protection', title: 'Protection des Données', icon: Database, intro: 'Nous croyons que vous devez avoir le contrôle total de vos données personnelles.', href: 'https://bloomsline.com/data-protection' },
    ],
  },
}

interface ConsentModalProps {
  visible: boolean
  onAccept: () => void
  locale: string
}

export function ConsentModal({ visible, onAccept, locale }: ConsentModalProps) {
  const insets = useSafeAreaInsets()
  const [accepted, setAccepted] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)

  const t = content[locale as keyof typeof content] || content.en

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* MVP notice */}
          <Text style={{ fontSize: 12, color: '#999', lineHeight: 18, marginBottom: 20 }}>
            {t.mvpNotice}
          </Text>

          {/* Header */}
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>
            {t.heading}
          </Text>
          <Text style={{ fontSize: 16, color: '#999', marginBottom: 24 }}>
            {t.subheading}
          </Text>

          {/* Sections */}
          <View style={{ borderTopWidth: 1, borderTopColor: '#EBEBEB' }}>
            {t.sections.map((section) => {
              const Icon = section.icon
              const isOpen = openSection === section.key
              return (
                <View key={section.key} style={{ borderBottomWidth: 1, borderBottomColor: '#EBEBEB' }}>
                  <TouchableOpacity
                    onPress={() => setOpenSection(isOpen ? null : section.key)}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
                      <Icon size={18} color="#555" />
                    </View>
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
                      {section.title}
                    </Text>
                    <ChevronDown
                      size={18}
                      color="#999"
                      style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
                    />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={{ paddingBottom: 16, paddingLeft: 48 }}>
                      <Text style={{ fontSize: 14, color: '#666', lineHeight: 21, marginBottom: 10 }}>
                        {section.intro}
                      </Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(section.href)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.bloom }}>
                          {t.readFull}
                        </Text>
                        <ExternalLink size={14} color={colors.bloom} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            })}
          </View>

          {/* Checkbox */}
          <TouchableOpacity
            onPress={() => setAccepted(!accepted)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 24 }}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 6,
              borderWidth: 2, borderColor: accepted ? colors.bloom : '#D4D4D4',
              backgroundColor: accepted ? colors.bloom : '#fff',
              justifyContent: 'center', alignItems: 'center',
              marginTop: 1,
            }}>
              {accepted && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: '#444', lineHeight: 20 }}>
              {t.checkboxLabel}
            </Text>
          </TouchableOpacity>

          {/* Continue */}
          <TouchableOpacity
            onPress={onAccept}
            disabled={!accepted}
            activeOpacity={0.85}
            style={{
              marginTop: 24, height: 52, borderRadius: 26,
              backgroundColor: accepted ? colors.bloom : '#E5E5E5',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: accepted ? '#fff' : '#999' }}>
              {t.continueButton}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}
