import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'

export default function Settings() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, member, signOut } = useAuth()
  const { t, locale, setLocale } = useI18n()

  const doSignOut = async () => {
    await signOut()
    router.replace('/(auth)/welcome')
  }

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t.settings.signOutConfirm)) {
        doSignOut()
      }
    } else {
      Alert.alert(t.settings.signOut, t.settings.signOutConfirm, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.settings.signOut, style: 'destructive', onPress: doSignOut },
      ])
    }
  }

  const displayName = member?.first_name
    ? `${member.first_name} ${member.last_name || ''}`
    : user?.user_metadata?.full_name || user?.email || ''

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
      {/* Header */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}
      >
        <Text style={{ fontSize: 18, color: '#000', marginTop: -1 }}>‹</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5, marginBottom: 32 }}>
        {t.settings.title}
      </Text>

      {/* Profile card */}
      <View style={{ backgroundColor: '#f8f8f8', borderRadius: 20, padding: 20, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5e5e5', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#666' }}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>{displayName}</Text>
          <Text style={{ fontSize: 13, color: '#999' }}>{user?.email}</Text>
        </View>
      </View>

      {/* Language picker */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          {t.settings.language}
        </Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 16, padding: 4 }}>
          <TouchableOpacity
            onPress={() => setLocale('en')}
            activeOpacity={0.7}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12,
              backgroundColor: locale === 'en' ? '#fff' : 'transparent',
              alignItems: 'center',
              shadowColor: locale === 'en' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: locale === 'en' ? 0.08 : 0,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: locale === 'en' ? '600' : '400', color: locale === 'en' ? '#000' : '#999' }}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLocale('fr')}
            activeOpacity={0.7}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12,
              backgroundColor: locale === 'fr' ? '#fff' : 'transparent',
              alignItems: 'center',
              shadowColor: locale === 'fr' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: locale === 'fr' ? 0.08 : 0,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: locale === 'fr' ? '600' : '400', color: locale === 'fr' ? '#000' : '#999' }}>
              Français
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View style={{ gap: 2 }}>
        <TouchableOpacity
          onPress={handleSignOut}
          style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 17, color: '#DC2626' }}>{t.settings.signOut}</Text>
          <Text style={{ fontSize: 17, color: '#DC2626' }}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 24, left: 24, right: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#ccc' }}>{t.settings.version}</Text>
      </View>
    </View>
  )
}
