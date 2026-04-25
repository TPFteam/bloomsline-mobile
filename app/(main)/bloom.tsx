import { useEffect } from 'react'
import { useRouter } from 'expo-router'

// Old Bloom page — redirects to home (Bloom is now accessed via BloomFullScreen on the home screen)
export default function Bloom() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/(main)/home')
  }, [])
  return null
}
