import { View } from 'react-native'
import { colors } from '@/lib/theme'

export function BloomLogo({ size = 36 }: { size?: number }) {
    const dot = size * 0.6
    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
                width: dot, height: dot, borderRadius: dot / 2,
                backgroundColor: colors.bloom,
            }} />
        </View>
    )
}
