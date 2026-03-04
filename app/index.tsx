import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '@/lib/auth-context'

export default function Index() {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (session) {
      router.replace('/(main)/home')
    } else {
      router.replace('/(auth)/welcome')
    }
  }, [session, loading])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  )
}
