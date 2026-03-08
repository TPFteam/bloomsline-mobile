import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { colors } from '@/lib/theme'
import { useAuth } from '@/lib/auth-context'
import {
  fetchBookingSettings, fetchAvailableSlots, createBooking,
  BookingSettings, SessionType, TimeSlot,
} from '@/lib/services/booking'

type Step = 'service' | 'datetime' | 'details' | 'confirm'
const STEPS: Step[] = ['service', 'datetime', 'details', 'confirm']

export default function BookingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const navigation = useNavigation()
  const { practitionerId } = useLocalSearchParams<{ practitionerId: string }>()
  const { user, member } = useAuth()

  const goBack = () => {
    if (navigation.canGoBack()) {
      router.back()
    } else {
      router.replace('/(main)/practitioner')
    }
  }

  const [step, setStep] = useState<Step>('service')
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [loading, setLoading] = useState(true)

  // Selections
  const [selectedService, setSelectedService] = useState<SessionType | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [practitionerTz, setPractitionerTz] = useState<string | null>(null)

  // Client details
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)

  const stepIndex = STEPS.indexOf(step)

  useEffect(() => {
    if (!practitionerId) return
    fetchBookingSettings(practitionerId).then(s => {
      setSettings(s)
      setLoading(false)
    })
  }, [practitionerId])

  // Pre-fill user details
  useEffect(() => {
    if (user?.email) setClientEmail(user.email)
    if (user?.user_metadata?.full_name) setClientName(user.user_metadata.full_name)
  }, [user])

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !practitionerId || !selectedService) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    fetchAvailableSlots(practitionerId, selectedDate, selectedService.duration).then(({ slots: s, practitionerTimezone }) => {
      setSlots(s)
      setPractitionerTz(practitionerTimezone)
      setSlotsLoading(false)
    })
  }, [selectedDate, practitionerId, selectedService])

  // ─── Calendar ──────────────────────────────────────

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + (settings?.max_advance_days || 60))

    const days: { day: number; date: string; disabled: boolean }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        day: d,
        date: dateStr,
        disabled: date < today || date > maxDate,
      })
    }
    return { days, offset: firstDay }
  }, [calendarMonth, settings])

  const monthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function prevMonth() {
    setCalendarMonth(p => {
      const m = p.month === 0 ? 11 : p.month - 1
      const y = p.month === 0 ? p.year - 1 : p.year
      return { year: y, month: m }
    })
  }

  function nextMonth() {
    setCalendarMonth(p => {
      const m = p.month === 11 ? 0 : p.month + 1
      const y = p.month === 11 ? p.year + 1 : p.year
      return { year: y, month: m }
    })
  }

  // ─── Validation ────────────────────────────────────

  function canContinue(): boolean {
    if (step === 'service') return !!selectedService
    if (step === 'datetime') return !!selectedDate && !!selectedSlot
    if (step === 'details') return clientName.trim().length > 0 && clientEmail.includes('@')
    return true
  }

  async function handleSubmit() {
    if (!selectedService || !selectedSlot || !practitionerId) return
    setSubmitting(true)

    const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const result = await createBooking({
      practitioner_id: practitionerId,
      session_type: selectedService.name,
      start_time: selectedSlot.slot_start,
      end_time: selectedSlot.slot_end,
      timezone: clientTz,
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      client_phone: clientPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      member_id: member?.id,
    })

    setSubmitting(false)

    if (result.success) {
      setRequiresApproval(!!result.requiresApproval)
      setSubmitted(true)
    } else {
      Alert.alert('Booking Failed', result.error || 'Please try again.')
    }
  }

  // ─── Loading / Error ──────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.bloom} />
      </View>
    )
  }

  if (!settings) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
        <Header insets={insets} onBack={() => goBack()} title="Book Appointment" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 15, color: '#8A8A8A', textAlign: 'center' }}>
            Online booking is not available for this practitioner.
          </Text>
        </View>
      </View>
    )
  }

  // ─── Success ──────────────────────────────────────

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
        <Header insets={insets} onBack={() => goBack()} title="Booking Confirmed" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bloom,
            justifyContent: 'center', alignItems: 'center', marginBottom: 20,
          }}>
            <Text style={{ fontSize: 28, color: '#fff' }}>✓</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary, marginBottom: 8, textAlign: 'center' }}>
            {requiresApproval ? 'Request Sent' : 'Booking Confirmed'}
          </Text>
          <Text style={{ fontSize: 15, color: '#8A8A8A', textAlign: 'center', lineHeight: 22 }}>
            {requiresApproval
              ? 'Your booking request has been sent. The practitioner will confirm your appointment shortly.'
              : 'Your session has been booked. You will receive a confirmation email.'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => goBack()}
            style={{
              marginTop: 32, backgroundColor: colors.primary, borderRadius: 16,
              paddingHorizontal: 32, paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ─── Main Flow ────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      <Header insets={insets} onBack={() => stepIndex > 0 ? setStep(STEPS[stepIndex - 1]) : goBack()} title="Book Appointment" />

      {/* Progress */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 6 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i <= stepIndex ? colors.bloom : '#EBEBEB',
          }} />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>

          {/* ═══ Step 1: Service ═══ */}
          {step === 'service' && (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
                Select a Service
              </Text>
              {settings.booking_instructions && (
                <Text style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 8 }}>
                  {settings.booking_instructions}
                </Text>
              )}
              {settings.session_types.map(st => {
                const selected = selectedService?.id === st.id
                return (
                  <TouchableOpacity
                    key={st.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedService(st)}
                    style={{
                      backgroundColor: '#fff', borderRadius: 16, padding: 20,
                      borderWidth: 2, borderColor: selected ? colors.bloom : '#EBEBEB',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>{st.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <Text style={{ fontSize: 13, color: '#8A8A8A' }}>{st.duration} minutes</Text>
                      {st.price != null && st.price > 0 && (
                        <Text style={{ fontSize: 13, color: '#8A8A8A' }}>${st.price}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {/* ═══ Step 2: Date & Time ═══ */}
          {step === 'datetime' && (
            <View style={{ gap: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
                Choose Date & Time
              </Text>

              {/* Calendar */}
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EBEBEB' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 18, color: colors.primary }}>‹</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>{monthLabel}</Text>
                  <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 18, color: colors.primary }}>›</Text>
                  </TouchableOpacity>
                </View>

                {/* Day headers */}
                <View style={{ flexDirection: 'row' }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <View key={d} style={{ flex: 1, alignItems: 'center', paddingBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#8A8A8A' }}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Day grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {Array.from({ length: calendarDays.offset }).map((_, i) => (
                    <View key={`empty-${i}`} style={{ width: '14.28%', height: 42 }} />
                  ))}
                  {calendarDays.days.map(({ day, date, disabled }) => {
                    const isSelected = selectedDate === date
                    return (
                      <TouchableOpacity
                        key={date}
                        disabled={disabled}
                        activeOpacity={0.7}
                        onPress={() => setSelectedDate(date)}
                        style={{
                          width: '14.28%', height: 42, justifyContent: 'center', alignItems: 'center',
                        }}
                      >
                        <View style={{
                          width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center',
                          backgroundColor: isSelected ? colors.bloom : 'transparent',
                        }}>
                          <Text style={{
                            fontSize: 14,
                            color: isSelected ? '#fff' : disabled ? '#d4d4d4' : colors.primary,
                            fontWeight: isSelected ? '600' : '400',
                          }}>
                            {day}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Time slots */}
              {selectedDate && (
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>
                    Available Times
                  </Text>
                  {slotsLoading ? (
                    <ActivityIndicator size="small" color={colors.bloom} style={{ marginTop: 12 }} />
                  ) : slots.length === 0 ? (
                    <Text style={{ fontSize: 14, color: '#8A8A8A' }}>No available times on this date.</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {slots.map(slot => {
                        const isSelected = selectedSlot?.slot_start === slot.slot_start
                        const time = new Date(slot.slot_start).toLocaleTimeString('en-US', {
                          hour: 'numeric', minute: '2-digit', hour12: true,
                        })
                        return (
                          <TouchableOpacity
                            key={slot.slot_start}
                            activeOpacity={0.8}
                            onPress={() => setSelectedSlot(slot)}
                            style={{
                              backgroundColor: isSelected ? colors.bloom : '#fff',
                              borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
                              borderWidth: 1, borderColor: isSelected ? colors.bloom : '#EBEBEB',
                            }}
                          >
                            <Text style={{
                              fontSize: 13, fontWeight: '500',
                              color: isSelected ? '#fff' : colors.primary,
                            }}>
                              {time}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}
                  {practitionerTz && practitionerTz !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
                    <Text style={{ fontSize: 12, color: '#8A8A8A', marginTop: 8 }}>
                      Times shown in your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ═══ Step 3: Details ═══ */}
          {step === 'details' && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
                Your Details
              </Text>
              <InputField label="Full Name *" value={clientName} onChangeText={setClientName} placeholder="Your full name" />
              <InputField label="Email *" value={clientEmail} onChangeText={setClientEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
              <InputField label="Phone" value={clientPhone} onChangeText={setClientPhone} placeholder="Optional" keyboardType="phone-pad" />
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                  Notes
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything you'd like us to know"
                  placeholderTextColor="#bbb"
                  multiline
                  style={{
                    backgroundColor: '#fff', borderRadius: 14, padding: 16, fontSize: 15,
                    color: colors.primary, borderWidth: 1, borderColor: '#EBEBEB',
                    minHeight: 80, textAlignVertical: 'top',
                  }}
                />
              </View>
            </View>
          )}

          {/* ═══ Step 4: Confirm ═══ */}
          {step === 'confirm' && selectedService && selectedSlot && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
                Review & Confirm
              </Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#EBEBEB', gap: 14 }}>
                <SummaryRow label="Service" value={selectedService.name} />
                <SummaryRow label="Duration" value={`${selectedService.duration} min`} />
                {selectedService.price != null && selectedService.price > 0 && (
                  <SummaryRow label="Price" value={`$${selectedService.price}`} />
                )}
                <View style={{ height: 1, backgroundColor: '#EBEBEB' }} />
                <SummaryRow
                  label="Date"
                  value={new Date(selectedSlot.slot_start).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                />
                <SummaryRow
                  label="Time"
                  value={new Date(selectedSlot.slot_start).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })}
                />
                <View style={{ height: 1, backgroundColor: '#EBEBEB' }} />
                <SummaryRow label="Name" value={clientName} />
                <SummaryRow label="Email" value={clientEmail} />
                {clientPhone.trim() ? <SummaryRow label="Phone" value={clientPhone} /> : null}
                {notes.trim() ? <SummaryRow label="Notes" value={notes} /> : null}
              </View>

              {settings.cancellation_policy && (
                <View style={{ backgroundColor: colors.surface1, borderRadius: 14, padding: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                    Cancellation Policy
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.primary, lineHeight: 18 }}>
                    {settings.cancellation_policy}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom button */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12,
          backgroundColor: '#FAFAF8', borderTopWidth: 1, borderTopColor: '#EBEBEB',
        }}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canContinue() || submitting}
            onPress={() => {
              if (step === 'confirm') {
                handleSubmit()
              } else {
                setStep(STEPS[stepIndex + 1])
              }
            }}
            style={{
              backgroundColor: canContinue() ? colors.bloom : '#EBEBEB',
              borderRadius: 16, paddingVertical: 16, alignItems: 'center',
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: canContinue() ? '#fff' : '#8A8A8A' }}>
                {step === 'confirm' ? 'Confirm Booking' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Shared Components ──────────────────────────────

function Header({ insets, onBack, title }: { insets: any; onBack: () => void; title: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
      backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
    }}>
      <TouchableOpacity
        onPress={onBack}
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
        {title}
      </Text>
      <View style={{ width: 36 }} />
    </View>
  )
}

function InputField({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (t: string) => void
  placeholder?: string; keyboardType?: any; autoCapitalize?: any
}) {
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          backgroundColor: '#fff', borderRadius: 14, padding: 16, fontSize: 15,
          color: colors.primary, borderWidth: 1, borderColor: '#EBEBEB',
        }}
      />
    </View>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 14, color: '#8A8A8A' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary, flex: 1, textAlign: 'right', marginLeft: 12 }}>{value}</Text>
    </View>
  )
}
