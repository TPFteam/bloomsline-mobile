import { TouchableOpacity, Text } from 'react-native'
import { useRouter, useNavigation } from 'expo-router'
import { colors } from '@/lib/theme'

interface BackButtonProps {
    onPress?: () => void
}

export function BackButton({ onPress }: BackButtonProps) {
    const router = useRouter()
    const navigation = useNavigation()

    const handleBack = () => {
        if (onPress) return onPress()
        if (navigation.canGoBack()) {
            router.back()
        } else {
            router.replace('/(main)/home')
        }
    }

    return (
        <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surface1,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Text style={{ fontSize: 18, color: colors.primary, marginTop: -1 }}>‹</Text>
        </TouchableOpacity>
    )
}
