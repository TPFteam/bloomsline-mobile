import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function Practitioner() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 17, color: '#000' }}>← Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5, marginBottom: 8 }}>
        My Practitioner
      </Text>
      <Text style={{ fontSize: 15, color: '#999', marginBottom: 48 }}>
        Your therapeutic journey, guided.
      </Text>

      {/* Placeholder — will connect to practitioner data */}
      <View style={{ backgroundColor: '#f8f8f8', borderRadius: 24, padding: 32, alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🌿</Text>
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#000', textAlign: 'center', marginBottom: 8 }}>
          Coming soon
        </Text>
        <Text style={{ fontSize: 15, color: '#999', textAlign: 'center', lineHeight: 22 }}>
          Connect with your practitioner, share your evolution, and track your therapeutic journey together.
        </Text>
      </View>
    </View>
  )
}
