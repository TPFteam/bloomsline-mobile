import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { colors } from '@/lib/theme'

export default function WebViewScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>()
  const [loading, setLoading] = useState(true)

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: colors.surface1,
            justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: colors.primary, marginTop: -1 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{
          flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary,
          textAlign: 'center', marginHorizontal: 12,
        }} numberOfLines={1}>
          {title || ''}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.bloom} />
        </View>
      )}

      {/* WebView */}
      {url ? (
        <WebView
          source={{ uri: url }}
          style={{ flex: 1 }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState={false}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, color: '#8A8A8A' }}>No URL provided</Text>
        </View>
      )}
    </View>
  )
}
