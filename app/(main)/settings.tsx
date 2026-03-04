import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'

export default function Settings() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, member, signOut } = useAuth()

  const doSignOut = async () => {
    await signOut()
    router.replace('/(auth)/welcome')
  }

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out — are you sure?')) {
        doSignOut()
      }
    } else {
      Alert.alert('Sign out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: doSignOut },
      ])
    }
  }

  const displayName = member?.first_name
    ? `${member.first_name} ${member.last_name || ''}`
    : user?.user_metadata?.full_name || user?.email || ''

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 17, color: '#000' }}>← Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5, marginBottom: 32 }}>
        Settings
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

      {/* Actions */}
      <View style={{ gap: 2 }}>
        <TouchableOpacity
          onPress={handleSignOut}
          style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 17, color: '#DC2626' }}>Sign out</Text>
          <Text style={{ fontSize: 17, color: '#DC2626' }}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 24, left: 24, right: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#ccc' }}>Bloomsline v2.0.0</Text>
      </View>
    </View>
  )
}
