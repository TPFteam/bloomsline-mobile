import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { colors } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { fetchPublicProfile, PractitionerPublicProfile } from '@/lib/services/booking'

function formatLabel(key: string, map: Record<string, string>) {
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function extractLocalized(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return val.en || Object.values(val)[0] || ''
}

export default function PractitionerProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const navigation = useNavigation()
  const { practitionerId } = useLocalSearchParams<{ practitionerId: string }>()
  const { t } = useI18n()

  const goBack = () => {
    if (navigation.canGoBack()) {
      router.back()
    } else {
      router.replace('/(main)/practitioner')
    }
  }
  const [profile, setProfile] = useState<PractitionerPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!practitionerId) return
    fetchPublicProfile(practitionerId).then(p => {
      setProfile(p)
      setLoading(false)
    })
  }, [practitionerId])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.bloom} />
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 15, color: '#8A8A8A' }}>{t.profile.notFound}</Text>
      </View>
    )
  }

  const credentialsSuffix = profile.credentials.length > 0 ? `, ${profile.credentials.join(', ')}` : ''
  const specialtyLabels = t.specialties as Record<string, string>
  const approachLabels = t.approaches as Record<string, string>

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
      }}>
        <TouchableOpacity
          onPress={() => goBack()}
          activeOpacity={0.7}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: colors.surface1,
            justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: colors.primary, marginTop: -1 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{
          flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary,
          textAlign: 'center', marginHorizontal: 12,
        }} numberOfLines={1}>
          {t.profile.title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* ─── Hero ─── */}
        <View style={{ backgroundColor: colors.bloom, paddingTop: 32, paddingBottom: 40, alignItems: 'center' }}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff', marginBottom: 16 }}
            />
          ) : (
            <View style={{
              width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff',
              backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
            }}>
              <Text style={{ fontSize: 36, color: '#fff' }}>
                {(profile.full_name || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
            {profile.full_name}{credentialsSuffix}
          </Text>
          {profile.headline && (
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
              {profile.headline}
            </Text>
          )}

          {/* Status badges */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16, paddingHorizontal: 24 }}>
            {profile.is_verified && (
              <Badge label={t.profile.verified} bg="rgba(255,255,255,0.25)" />
            )}
            {profile.client_acceptance_status === 'accepting' && (
              <Badge label={t.profile.acceptingClients} bg="rgba(255,255,255,0.25)" />
            )}
            {profile.client_acceptance_status === 'waitlist' && (
              <Badge label={t.profile.waitlist} bg="rgba(255,255,255,0.15)" />
            )}
            {profile.offers_telehealth && <Badge label={t.profile.telehealth} bg="rgba(255,255,255,0.25)" />}
            {profile.offers_in_person && <Badge label={t.profile.inPerson} bg="rgba(255,255,255,0.25)" />}
            {profile.years_experience && (
              <Badge label={t.profile.yearsExperience.replace('{years}', String(profile.years_experience))} bg="rgba(255,255,255,0.25)" />
            )}
          </View>
        </View>

        {/* ─── Action Buttons ─── */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: -20 }}>
          {(profile.bookingUrl || profile.booking_page_enabled) && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(main)/booking', params: { practitionerId: profile.user_id } })}
              style={{
                flex: 1, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14,
                alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t.profile.bookSession}</Text>
            </TouchableOpacity>
          )}
          {profile.contact_email && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => Linking.openURL(`mailto:${profile.contact_email}`)}
              style={{
                flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14,
                alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t.profile.contact}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ padding: 20, gap: 24 }}>

          {/* ─── About ─── */}
          {profile.bio && (
            <Section title={t.profile.about}>
              <Text style={{ fontSize: 15, color: colors.primary, lineHeight: 22 }}>{profile.bio}</Text>
            </Section>
          )}

          {/* ─── Specialties ─── */}
          {profile.specialties.length > 0 && (
            <Section title={t.profile.specialties}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.specialties.map(s => (
                  <Pill key={s} label={formatLabel(s, specialtyLabels)} />
                ))}
              </View>
            </Section>
          )}

          {/* ─── Approaches ─── */}
          {profile.approaches.length > 0 && (
            <Section title={t.profile.approaches}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.approaches.map(a => (
                  <Pill key={a} label={formatLabel(a, approachLabels)} variant="outlined" />
                ))}
              </View>
            </Section>
          )}

          {/* ─── Education & Licenses ─── */}
          {(profile.education.length > 0 || profile.licenses.length > 0) && (
            <Section title={t.profile.credentials}>
              {profile.education.map((e, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{e.degree}</Text>
                  <Text style={{ fontSize: 13, color: '#8A8A8A' }}>
                    {e.institution}{e.year_completed ? ` · ${e.year_completed}` : ''}
                  </Text>
                </View>
              ))}
              {profile.licenses.map((l, i) => (
                <View key={`l-${i}`} style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                    {l.type}{l.is_verified ? ' ✓' : ''}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#8A8A8A' }}>{l.state_province}</Text>
                </View>
              ))}
            </Section>
          )}

          {/* ─── Session Info ─── */}
          {(profile.session_types.length > 0 || profile.age_groups.length > 0 || profile.languages.length > 0) && (
            <Section title={t.profile.sessionInfo}>
              {profile.session_types.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                    {t.profile.sessionTypes}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {profile.session_types.map(st => (
                      <Pill key={st} label={formatLabel(st, {})} small />
                    ))}
                  </View>
                </View>
              )}
              {profile.age_groups.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                    {t.profile.agesServed}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {profile.age_groups.map(a => (
                      <Pill key={a} label={formatLabel(a, {})} small />
                    ))}
                  </View>
                </View>
              )}
              {profile.languages.length > 0 && (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                    {t.profile.languages}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.primary }}>{profile.languages.join(', ')}</Text>
                </View>
              )}
            </Section>
          )}

          {/* ─── Fees ─── */}
          {(profile.session_fee_min || profile.session_fee_max) && (
            <Section title={t.profile.fees}>
              <Text style={{ fontSize: 15, color: colors.primary }}>
                {profile.fee_currency || '$'}
                {profile.session_fee_min}
                {profile.session_fee_max && profile.session_fee_max !== profile.session_fee_min
                  ? ` – ${profile.fee_currency || '$'}${profile.session_fee_max}`
                  : ''} {t.profile.perSession}
              </Text>
              {profile.offers_sliding_scale && (
                <Text style={{ fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>{t.profile.slidingScale}</Text>
              )}
            </Section>
          )}

          {/* ─── Location ─── */}
          {profile.practice_location && (profile.practice_location.city || profile.practice_location.state_province) && (
            <Section title={t.profile.location}>
              <Text style={{ fontSize: 15, color: colors.primary }}>
                {[profile.practice_location.city, profile.practice_location.state_province, profile.practice_location.country]
                  .filter(Boolean).join(', ')}
              </Text>
            </Section>
          )}

          {/* ─── Publications ─── */}
          {profile.publications.length > 0 && (
            <Section title={t.profile.publications}>
              {profile.publications.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => p.url && Linking.openURL(p.url)}
                  disabled={!p.url}
                  style={{
                    backgroundColor: '#fff', borderRadius: 14, padding: 16,
                    borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                    {p.type}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>{extractLocalized(p.title)}</Text>
                  {p.description && (
                    <Text style={{ fontSize: 13, color: '#8A8A8A', marginTop: 4 }} numberOfLines={2}>
                      {extractLocalized(p.description)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </Section>
          )}

          {/* ─── Social Links ─── */}
          {profile.social_links && (profile.social_links.website || profile.social_links.linkedin) && (
            <Section title={t.profile.links}>
              <View style={{ gap: 8 }}>
                {profile.social_links.website && (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(profile.social_links!.website!)}>
                    <Text style={{ fontSize: 14, color: colors.bloom, fontWeight: '500' }}>
                      {t.profile.website}
                    </Text>
                  </TouchableOpacity>
                )}
                {profile.social_links.linkedin && (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(profile.social_links!.linkedin!)}>
                    <Text style={{ fontSize: 14, color: colors.bloom, fontWeight: '500' }}>
                      {t.profile.linkedin}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Section>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Shared Components ──────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: '#EBEBEB',
    }}>
      <Text style={{
        fontSize: 12, fontWeight: '600', color: '#8A8A8A',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
      }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function Badge({ label, bg }: { label: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 }}>
      <Text style={{ fontSize: 12, fontWeight: '500', color: '#fff' }}>{label}</Text>
    </View>
  )
}

function Pill({ label, variant, small }: { label: string; variant?: 'outlined'; small?: boolean }) {
  return (
    <View style={{
      backgroundColor: variant === 'outlined' ? 'transparent' : colors.surface1,
      borderRadius: 12,
      paddingHorizontal: small ? 10 : 14,
      paddingVertical: small ? 4 : 6,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: '#EBEBEB',
    }}>
      <Text style={{ fontSize: small ? 12 : 13, fontWeight: '500', color: colors.primary }}>{label}</Text>
    </View>
  )
}
