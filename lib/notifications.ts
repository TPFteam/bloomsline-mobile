import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { supabase } from './supabase'

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Request notification permissions and register push token.
 * Call this AFTER auth is complete and member is loaded.
 * Safe to call multiple times — only registers once per session.
 */
export async function registerForPushNotifications(memberId: string): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[notifications] Skipping — not a physical device')
    return null
  }

  // Web doesn't support Expo push notifications
  if (Platform.OS === 'web') {
    return null
  }

  try {
    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('[notifications] Permission not granted')
      return null
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })
    const pushToken = tokenData.data

    // Save token to member record
    await supabase
      .from('members')
      .update({ push_token: pushToken, push_token_updated_at: new Date().toISOString() })
      .eq('id', memberId)

    console.log('[notifications] Registered push token:', pushToken.slice(0, 20) + '...')
    return pushToken
  } catch (error) {
    console.warn('[notifications] Registration failed:', error)
    return null
  }
}

/**
 * Clear push token on sign-out.
 */
export async function clearPushToken(memberId: string): Promise<void> {
  try {
    await supabase
      .from('members')
      .update({ push_token: null })
      .eq('id', memberId)
  } catch {
    // Silently fail — user is signing out anyway
  }
}

/**
 * Add a listener for incoming notifications.
 * Returns a cleanup function.
 */
export function onNotificationReceived(
  callback: (notification: Notifications.Notification) => void
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(callback)
  return () => subscription.remove()
}

/**
 * Add a listener for when user taps a notification.
 * Returns a cleanup function.
 */
export function onNotificationTapped(
  callback: (response: Notifications.NotificationResponse) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback)
  return () => subscription.remove()
}
