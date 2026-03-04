import { View, Text, TouchableOpacity, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

export default function Welcome() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Top section */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        {/* Bloom logo — 4 dots in cross pattern */}
        <View style={{ marginBottom: 48 }}>
          <View style={{ width: 48, height: 48, position: 'relative' }}>
            <View style={{ position: 'absolute', top: 0, left: 16, width: 14, height: 14, borderRadius: 7, backgroundColor: '#000' }} />
            <View style={{ position: 'absolute', top: 17, left: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#000' }} />
            <View style={{ position: 'absolute', top: 17, left: 34, width: 14, height: 14, borderRadius: 7, backgroundColor: '#000' }} />
            <View style={{ position: 'absolute', top: 34, left: 16, width: 14, height: 14, borderRadius: 7, backgroundColor: '#000' }} />
          </View>
        </View>

        <Text style={{ fontSize: 32, fontWeight: '700', color: '#000', textAlign: 'center', letterSpacing: -0.5 }}>
          Your emotional{'\n'}journey starts here.
        </Text>
        <Text style={{ fontSize: 17, color: '#999', textAlign: 'center', marginTop: 16, lineHeight: 24 }}>
          Capture moments. See patterns.{'\n'}Watch yourself evolve.
        </Text>
      </View>

      {/* Bottom section */}
      <View style={{ paddingHorizontal: 24, gap: 12, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-up')}
          style={{
            backgroundColor: '#000',
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-in')}
          style={{
            backgroundColor: '#f5f5f5',
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#000', fontSize: 17, fontWeight: '600' }}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
