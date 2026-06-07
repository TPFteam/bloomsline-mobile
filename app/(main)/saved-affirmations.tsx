import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Heart } from 'lucide-react-native'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { ConfirmModal } from '@/components/ConfirmModal'

interface Favorite { id: string; text: string }

export default function SavedAffirmations() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { locale } = useI18n()
  const fr = locale === 'fr'
  const [items, setItems] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('affirmation_favorites')
        .select('id, text')
        .order('created_at', { ascending: false })
      setItems((data as Favorite[]) || [])
      setLoading(false)
    })()
  }, [])

  const doRemove = async (id: string) => {
    setPendingDelete(null)
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('affirmation_favorites').delete().eq('id', id)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.push('/(main)/for-you')}
        activeOpacity={0.7}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ fontSize: 18, color: '#000', marginTop: -1 }}>‹</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 32, fontWeight: '700', color: '#000', letterSpacing: -0.5, marginBottom: 20 }}>
        {fr ? 'Enregistrées' : 'Saved'}
      </Text>

      {loading ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}><ActivityIndicator color="#999" /></View>
      ) : items.length === 0 ? (
        <Text style={{ fontSize: 14, color: '#999', marginTop: 12 }}>
          {fr ? 'Touchez le ❤️ pour garder des mots ici.' : 'Tap the ❤️ to keep words here.'}
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {items.map((it) => (
            <View key={it.id} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#EEE', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '500', color: '#1A1A1A', lineHeight: 25 }}>{it.text}</Text>
              <TouchableOpacity onPress={() => setPendingDelete(it.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Heart size={20} color="#F43F5E" fill="#F43F5E" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <ConfirmModal
        visible={!!pendingDelete}
        title={fr ? 'Retirer des favoris ?' : 'Remove from saved?'}
        message={fr
          ? 'Ces mots seront définitivement supprimés. Vous ne pourrez pas les récupérer.'
          : 'These words will be gone forever — you won’t be able to get them back.'}
        confirmLabel={fr ? 'Supprimer' : 'Remove'}
        cancelLabel={fr ? 'Annuler' : 'Cancel'}
        destructive
        onConfirm={() => pendingDelete && doRemove(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  )
}
