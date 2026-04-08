import { Platform, useWindowDimensions, View, Text } from 'react-native'
import { Image } from 'react-native'
import { useI18n } from '@/lib/i18n'

const QR_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://app.bloomsline.com&color=1A1A1A&bgcolor=FFFFFF'

export function DesktopWrapper({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions()
  const { t } = useI18n()

  // Only apply on web with wide screens
  if (Platform.OS !== 'web' || width < 768) {
    return <>{children}</>
  }

  const frameW = 420
  const frameH = Math.min(height - 60, Math.round(frameW / 0.462))

  return (
    <View style={{
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#F5F5F3',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 50,
    }}>
      {/* Phone frame */}
      <View style={{
        width: frameW,
        height: frameH,
        borderRadius: 40,
        backgroundColor: '#000',
        padding: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
      }}>
        {/* Notch */}
        <View style={{
          position: 'absolute',
          top: 6,
          left: '50%',
          marginLeft: -50,
          width: 100,
          height: 24,
          backgroundColor: '#000',
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          zIndex: 100,
        }} />
        {/* Screen */}
        <View style={{
          flex: 1,
          borderRadius: 34,
          overflow: 'hidden',
          backgroundColor: '#FAFAF8',
          width: frameW - 12,
        }}>
          {children}
        </View>
        {/* Home indicator */}
        <View style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          marginLeft: -35,
          width: 70,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#333',
          zIndex: 100,
        }} />
      </View>

      {/* Right side — message + QR */}
      <View style={{ maxWidth: 300, alignItems: 'flex-start' }}>
        {/* Logo */}
        <Text style={{ fontSize: 24, fontWeight: '500', color: '#1A1A1A', marginBottom: 4 }}>
          blooms<Text style={{ fontWeight: '300', color: '#4A9A86' }}>line</Text>
        </Text>
        <Text style={{ fontSize: 14, color: '#999', marginBottom: 32 }}>
          {t.desktop.tagline}
        </Text>

        {/* Message */}
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A', lineHeight: 28, marginBottom: 8 }}>
          {t.desktop.title}
        </Text>
        <Text style={{ fontSize: 15, color: '#888', lineHeight: 22, marginBottom: 28 }}>
          {t.desktop.subtitle}
        </Text>

        {/* QR Code */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 20,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#EBEBEB',
          marginBottom: 20,
        }}>
          <Image
            source={{ uri: QR_URL }}
            style={{ width: 160, height: 160, borderRadius: 8 }}
          />
          <Text style={{ fontSize: 12, color: '#BBB', marginTop: 12 }}>
            app.bloomsline.com
          </Text>
        </View>

        <View style={{
          backgroundColor: '#F0FDF4',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: '#D1FAE5',
        }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>
            {t.desktop.noDownload}
          </Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {t.desktop.worksInstantly}
          </Text>
        </View>
      </View>
    </View>
  )
}
