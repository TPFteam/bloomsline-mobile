import { Stack } from 'expo-router'

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="capture" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="evolution" />
      <Stack.Screen name="practitioner" />
      <Stack.Screen name="settings" />
    </Stack>
  )
}
