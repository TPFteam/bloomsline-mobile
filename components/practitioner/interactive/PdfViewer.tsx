import { useState } from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { FileText, X, ExternalLink } from 'lucide-react-native'
import { colors } from '@/lib/theme'


interface PdfViewerProps {
  content: string
  url: string
  fileName?: string
}

export function PdfViewer({ content, url, fileName }: PdfViewerProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!url) return null

  return (
    <View>
      {/* Card to open the PDF */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
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

      {/* PDF Viewer — fullscreen overlay with inline rendering */}
      {isOpen && (
        Platform.OS === 'web' ? (
          <View style={{
            position: 'fixed' as any,
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 999,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 16, paddingVertical: 10,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, marginRight: 12 }} numberOfLines={1}>
                {fileName || content}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (typeof window !== 'undefined') window.open(url, '_blank')
                  }}
                  style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <ExternalLink size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsOpen(false)}
                  style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* PDF rendered inline via Google Docs viewer (works on mobile PWA) */}
            {/* @ts-ignore — HTML iframe for web */}
            <iframe
              src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#fff',
              }}
              title={fileName || 'PDF Document'}
            />
          </View>
        ) : (
          // Native fallback — open externally
          (() => {
            import('expo-linking').then(Linking => Linking.openURL(url)).catch(() => {})
            setIsOpen(false)
            return null
          })()
        )
      )}
    </View>
  )
}
