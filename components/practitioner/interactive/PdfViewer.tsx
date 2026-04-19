import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { FileText } from 'lucide-react-native'
import { colors } from '@/lib/theme'

interface PdfViewerProps {
  content: string
  url: string
  fileName?: string
  onOpenPdf?: (url: string, name: string) => void
}

export function PdfViewer({ content, url, fileName, onOpenPdf }: PdfViewerProps) {
  if (!url) return null

  return (
    <TouchableOpacity
      onPress={() => {
        if (onOpenPdf) {
          onOpenPdf(url, fileName || content)
        } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(url, '_blank')
        } else {
          import('expo-linking').then(Linking => Linking.openURL(url)).catch(() => {})
        }
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
      }}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <FileText size={24} color="#EF4444" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111' }}>{content}</Text>
        {fileName && (
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }} numberOfLines={1}>{fileName}</Text>
        )}
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.bloom }}>
        {Platform.OS === 'web' ? 'View' : 'Open'}
      </Text>
    </TouchableOpacity>
  )
}
