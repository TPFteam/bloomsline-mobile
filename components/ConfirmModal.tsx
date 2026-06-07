import { View, Text, TouchableOpacity, Modal } from 'react-native'
import { colors } from '@/lib/theme'

// On-brand confirmation dialog (replaces the browser's window.confirm /
// native Alert). Works on web and native via RN Modal.
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity activeOpacity={1} onPress={onCancel} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{
          backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360,
          shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 10,
        }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 }}>{title}</Text>
          {message ? (
            <Text style={{ fontSize: 14, color: '#666', lineHeight: 21, marginBottom: 22 }}>{message}</Text>
          ) : <View style={{ height: 12 }} />}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.85}
              style={{ flex: 1, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#555' }}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.85}
              style={{ flex: 1, height: 50, borderRadius: 25, backgroundColor: destructive ? '#EF4444' : colors.bloom, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
