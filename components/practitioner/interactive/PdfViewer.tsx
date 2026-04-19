import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, ScrollView, Dimensions, Platform } from 'react-native'
import { FileText, X, ExternalLink } from 'lucide-react-native'
import { colors } from '@/lib/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

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

      {/* PDF Viewer Modal */}
      {Platform.OS === 'web' ? (
        // Web: use iframe in a portal-style overlay
        isOpen && (
          <View style={{
            position: 'fixed' as any,
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 999,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {/* Header */}
            <View style={{
              position: 'absolute' as any, top: 0, left: 0, right: 0,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 20, paddingVertical: 12, zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }} numberOfLines={1}>
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

            {/* PDF iframe */}
            {/* @ts-ignore — HTML iframe for web */}
            <iframe
              src={url}
              style={{
                width: '90%',
                height: '85%',
                border: 'none',
                borderRadius: 12,
                marginTop: 48,
                backgroundColor: '#fff',
              }}
              title={fileName || 'PDF Document'}
            />
          </View>
        )
      ) : (
        // Native: open in external viewer
        <Modal visible={isOpen} animationType="slide" presentationStyle="fullScreen">
          <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 60 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111' }}>{fileName || content}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={{ padding: 8 }}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 40 }}>
                PDF viewing is best on the web version.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Open URL externally
                  import('expo-linking').then(Linking => Linking.openURL(url)).catch(() => {})
                }}
                style={{ marginTop: 20, backgroundColor: colors.bloom, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Open PDF</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  )
}
