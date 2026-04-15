import { Modal, View, Platform, ModalProps } from 'react-native'
import { useIsDesktopWrapped } from './DesktopWrapper'

/**
 * Modal that stays contained inside the DesktopWrapper phone frame.
 * On mobile/native: uses regular Modal (portal to root).
 * On desktop web inside DesktopWrapper: uses absolute-positioned overlay.
 */
export function ContainedModal({ visible, children, transparent, animationType, onRequestClose, ...rest }: ModalProps) {
  const isDesktopWrapped = useIsDesktopWrapped()

  // On native or mobile web, use regular Modal
  if (Platform.OS !== 'web' || !isDesktopWrapped) {
    return (
      <Modal visible={visible} transparent={transparent} animationType={animationType} onRequestClose={onRequestClose} {...rest}>
        {children}
      </Modal>
    )
  }

  // On desktop web inside DesktopWrapper, use absolute overlay
  if (!visible) return null

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      {children}
    </View>
  )
}
