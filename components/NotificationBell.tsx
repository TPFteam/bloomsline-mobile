import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, Modal, Pressable, ScrollView, ActivityIndicator,
} from 'react-native'
import { Bell, X, BookOpen, Calendar, CheckCircle, MessageSquare, Clock, FileText } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  action_url?: string
  entity_type?: string
  metadata?: Record<string, unknown>
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'resource_shared':
    case 'resource_assigned':
      return BookOpen
    case 'resource_submitted':
    case 'resource_started':
      return FileText
    case 'session_scheduled':
    case 'session_reminder_24h':
    case 'session_reminder_1h':
      return Calendar
    case 'booking_confirmed':
    case 'booking_request':
      return Calendar
    case 'session_confirmed':
      return CheckCircle
    case 'reschedule_requested':
      return Clock
    default:
      return MessageSquare
  }
}

function getNotificationColor(type: string) {
  if (type.startsWith('resource')) return colors.bloom
  if (type.startsWith('session') || type.startsWith('booking')) return '#3B82F6'
  if (type.startsWith('member')) return '#8B5CF6'
  return '#6B7280'
}

function timeAgo(dateStr: string, locale: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return locale === 'fr' ? "à l'instant" : 'just now'
  if (diffMin < 60) return locale === 'fr' ? `il y a ${diffMin}m` : `${diffMin}m ago`
  if (diffH < 24) return locale === 'fr' ? `il y a ${diffH}h` : `${diffH}h ago`
  if (diffD < 7) return locale === 'fr' ? `il y a ${diffD}j` : `${diffD}d ago`
  return new Date(dateStr).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationBell({ onOpenResource }: { onOpenResource?: (resourceId: string) => void }) {
  const { user } = useAuth()
  const { locale } = useI18n()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, read, created_at, action_url, entity_type, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifications(data)
    setLoading(false)
  }, [user?.id])

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadCount(count || 0)
  }, [user?.id])

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications(prev => [newNotif, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const deleteNotification = async (id: string) => {
    const notif = notifications.find(n => n.id === id)
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (notif && !notif.read) setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    if (!user?.id) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const openPanel = () => {
    fetchNotifications()
    setIsOpen(true)
  }

  return (
    <>
      {/* Bell Icon with Badge */}
      <TouchableOpacity
        onPress={openPanel}
        activeOpacity={0.7}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: '#f5f5f5',
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        <Bell size={18} color="#666" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute', top: -2, right: -2,
            backgroundColor: '#EF4444', borderRadius: 10,
            minWidth: 18, height: 18, paddingHorizontal: 4,
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 2, borderColor: '#fff',
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Notifications Modal */}
      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <Pressable style={{ flex: 0.15 }} onPress={() => setIsOpen(false)} />
          <View style={{
            flex: 0.85, backgroundColor: '#fff',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12,
              borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
            }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
                {locale === 'fr' ? 'Notifications' : 'Notifications'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllRead}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.bloom }}>
                      {locale === 'fr' ? 'Tout lire' : 'Mark all read'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                  <X size={22} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* List */}
            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.bloom} />
              </View>
            ) : notifications.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <Bell size={40} color="#ddd" strokeWidth={1.2} />
                <Text style={{ fontSize: 15, color: '#999', marginTop: 16, textAlign: 'center' }}>
                  {locale === 'fr' ? 'Aucune notification pour le moment' : 'No notifications yet'}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {notifications.map((notif) => {
                  const Icon = getNotificationIcon(notif.type)
                  const iconColor = getNotificationColor(notif.type)
                  return (
                    <TouchableOpacity
                      key={notif.id}
                      onPress={() => {
                        if (!notif.read) markAsRead(notif.id)
                        const resourceId = (notif.metadata as any)?.resourceId
                        if (resourceId && onOpenResource) {
                          setIsOpen(false)
                          onOpenResource(resourceId)
                        }
                      }}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row', gap: 14,
                        paddingHorizontal: 24, paddingVertical: 16,
                        backgroundColor: notif.read ? '#fff' : '#F0FDF4',
                        borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
                      }}
                    >
                      <View style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: `${iconColor}15`,
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Icon size={18} color={iconColor} strokeWidth={1.8} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Text style={{
                            fontSize: 14, fontWeight: notif.read ? '500' : '700',
                            color: colors.primary, flex: 1, marginRight: 8,
                          }}>
                            {notif.title}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {!notif.read && (
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bloom }} />
                            )}
                            <TouchableOpacity
                              onPress={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <X size={14} color="#ccc" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text style={{ fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 }} numberOfLines={2}>
                          {notif.body}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                          {timeAgo(notif.created_at, locale)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  )
}
