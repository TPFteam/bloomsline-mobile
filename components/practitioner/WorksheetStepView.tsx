import { useState, useRef, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from 'react-native'
import { ChevronLeft, ChevronRight, ChevronDown, Check, Save, X } from 'lucide-react-native'
import { renderBlock } from './BlockRenderer'
import { colors } from '@/lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const STEP_COLORS = [
  '#4A9A86', // teal (brand)
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#F97316', // orange
  '#F43F5E', // pink
  '#10B981', // emerald
  '#2D5F8A', // dark blue
  '#F59E0B', // amber
]

// Content-only block types (not questions)
const CONTENT_TYPES = new Set([
  'heading', 'paragraph', 'quote', 'tip', 'divider', 'key_points',
  'callout', 'image', 'video', 'audio', 'link', 'pdf_document',
])

// Immersive blocks that should be full-screen (bypass card)
const IMMERSIVE_TYPES = new Set([
  'breathing', 'visualization', 'body_scan', 'timed_action',
])

interface Step {
  contextBlocks: any[] // heading, paragraph, tip, etc.
  questionBlock: any | null // the actual question
  color: string
}

interface WorksheetStepViewProps {
  blocks: any[]
  responses: Record<string, unknown>
  onResponseChange: (blockId: string, value: unknown) => void
  onSaveDraft?: () => void
  onSubmit: () => void
  onClose: () => void
  saving?: boolean
  submitting?: boolean
  isCompleted?: boolean
  t: any
  locale?: string
  draftResponseId?: string | null
}

function groupBlocksIntoSteps(blocks: any[]): Step[] {
  const steps: Step[] = []
  let pendingContext: any[] = []

  for (const block of blocks) {
    if (CONTENT_TYPES.has(block.type)) {
      pendingContext.push(block)
    } else {
      // This is a question block
      steps.push({
        contextBlocks: pendingContext,
        questionBlock: block,
        color: STEP_COLORS[steps.length % STEP_COLORS.length],
      })
      pendingContext = []
    }
  }

  // Trailing content with no question → info slide
  if (pendingContext.length > 0) {
    steps.push({
      contextBlocks: pendingContext,
      questionBlock: null,
      color: STEP_COLORS[steps.length % STEP_COLORS.length],
    })
  }

  return steps
}

export function WorksheetStepView({
  blocks,
  responses,
  onResponseChange,
  onSaveDraft,
  onSubmit,
  onClose,
  saving,
  submitting,
  isCompleted,
  t,
  locale,
  draftResponseId,
}: WorksheetStepViewProps) {
  const steps = groupBlocksIntoSteps(blocks)
  const [currentStep, setCurrentStep] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const scrollRef = useRef<ScrollView>(null)
  const scrollViewHeight = useRef(0)
  const innerContentHeight = useRef(0)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false)
  const [contentMeasured, setContentMeasured] = useState(false)
  const [contentOverflows, setContentOverflows] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [peekIndex, setPeekIndex] = useState<number | null>(null)

  const step = steps[currentStep]
  if (!step) return null

  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0
  const totalSteps = steps.length

  // Check if current question is answered
  const canProceed = (() => {
    if (!step.questionBlock) return true // info slide
    if (isCompleted) return true
    const val = responses[step.questionBlock.id]
    if (!step.questionBlock.required) return true
    if (val === undefined || val === null || val === '') return false
    if (Array.isArray(val) && val.length === 0) return false
    return true
  })()

  const animateTransition = useCallback((_direction: 'next' | 'back', callback: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      callback()
      scrollRef.current?.scrollTo({ y: 0, animated: false })
      setIsScrolledToBottom(false)
      setContentOverflows(false)
      setContentMeasured(false)
      setShowScrollHint(false)
      setPeekIndex(null)
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    })
  }, [fadeAnim])

  const goNext = () => {
    if (isLast) {
      onSubmit()
    } else {
      animateTransition('next', () => setCurrentStep(prev => prev + 1))
    }
  }

  const goBack = () => {
    if (isFirst) {
      onClose()
    } else {
      animateTransition('back', () => setCurrentStep(prev => prev - 1))
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: step.color }}>
      {/* Header: progress bar + save draft — on colored background */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' }}>
            <X size={16} color="#fff" />
          </TouchableOpacity>
          {/* Progress bar (flex center) */}
          <View style={{ flex: 1, marginHorizontal: 16, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: '#fff', width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
          </View>
          {onSaveDraft && draftResponseId && !isCompleted ? (
            <TouchableOpacity onPress={onSaveDraft} disabled={saving} style={{ padding: 4 }}>
              <Save size={18} color={saving ? 'rgba(255,255,255,0.4)' : '#fff'} />
            </TouchableOpacity>
          ) : (
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
              {currentStep + 1} {locale === 'fr' ? 'sur' : 'of'} {totalSteps}
            </Text>
          )}
        </View>
      </View>

      {/* Previous answer chip — tap to open peek overlay */}
      {currentStep > 0 && (() => {
        const prevStep = steps[currentStep - 1]
        if (!prevStep?.questionBlock) return null
        const prevVal = responses[prevStep.questionBlock.id]
        if (prevVal === undefined || prevVal === null || prevVal === '') return null

        let answerText = ''
        if (Array.isArray(prevVal)) answerText = prevVal.join(', ')
        else if (typeof prevVal === 'object') answerText = JSON.stringify(prevVal)
        else answerText = String(prevVal)
        if (answerText.length > 40) answerText = answerText.slice(0, 38) + '...'

        return (
          <TouchableOpacity
            onPress={() => setPeekIndex(currentStep - 1)}
            style={{
              marginHorizontal: 20, marginBottom: 4,
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 16,
              paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start',
            }}
          >
            <ChevronLeft size={12} color="rgba(255,255,255,0.7)" />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' }} numberOfLines={1}>{answerText}</Text>
          </TouchableOpacity>
        )
      })()}

      {/* Peek overlay — shows previous Q&A with navigation */}
      {peekIndex !== null && (() => {
        const pStep = steps[peekIndex]
        if (!pStep?.questionBlock) { setPeekIndex(null); return null }
        const qBlock = pStep.questionBlock
        const qText = typeof qBlock.content === 'string' ? qBlock.content : (qBlock.content?.fr || qBlock.content?.en || '')
        const val = responses[qBlock.id]
        let aText = ''
        if (Array.isArray(val)) aText = val.join(', ')
        else if (typeof val === 'object' && val) aText = JSON.stringify(val)
        else if (val !== undefined && val !== null) aText = String(val)

        // Find navigable range (only past steps with questions)
        const answeredSteps = steps.slice(0, currentStep).map((s, i) => ({ ...s, idx: i })).filter(s => s.questionBlock && responses[s.questionBlock.id] !== undefined)
        const peekPos = answeredSteps.findIndex(s => s.idx === peekIndex)

        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
            <TouchableOpacity activeOpacity={1} onPress={() => setPeekIndex(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
            <View style={{
              position: 'absolute', top: 80, left: 16, right: 16,
              backgroundColor: '#fff', borderRadius: 20, padding: 20,
              shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
            }}>
              {/* Nav header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <TouchableOpacity
                  disabled={peekPos <= 0}
                  onPress={() => { if (peekPos > 0) setPeekIndex(answeredSteps[peekPos - 1].idx) }}
                  style={{ opacity: peekPos > 0 ? 1 : 0.3, padding: 4 }}
                >
                  <ChevronLeft size={20} color="#374151" />
                </TouchableOpacity>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF' }}>
                  {locale === 'fr' ? `Question ${peekIndex + 1}` : `Question ${peekIndex + 1}`}
                </Text>
                <TouchableOpacity
                  disabled={peekPos >= answeredSteps.length - 1}
                  onPress={() => { if (peekPos < answeredSteps.length - 1) setPeekIndex(answeredSteps[peekPos + 1].idx) }}
                  style={{ opacity: peekPos < answeredSteps.length - 1 ? 1 : 0.3, padding: 4 }}
                >
                  <ChevronRight size={20} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Question */}
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12, lineHeight: 21 }}>{qText}</Text>

              {/* Answer */}
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14 }}>
                <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{aText || (locale === 'fr' ? 'Pas de réponse' : 'No answer')}</Text>
              </View>

              {/* Close */}
              <TouchableOpacity onPress={() => setPeekIndex(null)} style={{ alignSelf: 'center', marginTop: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>{locale === 'fr' ? 'Fermer' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })()}

      {/* Step content — on colored background */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => {
          scrollViewHeight.current = e.nativeEvent.layout.height
          // Re-check overflow when scroll view size is known
          if (innerContentHeight.current > 0) {
            const overflows = innerContentHeight.current > scrollViewHeight.current - 80
            setContentOverflows(overflows)
            setIsScrolledToBottom(!overflows)
            setContentMeasured(true)
          }
        }}
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent
          const paddingBottom = 120
          const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingBottom + 20
          setIsScrolledToBottom(atBottom)
        }}
        scrollEventThrottle={16}
      >
        <Animated.View
          style={{ opacity: fadeAnim, width: '100%', maxWidth: '100%' }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height
            innerContentHeight.current = h
            const visibleH = scrollViewHeight.current || (Dimensions.get('window').height - 140)
            const overflows = h > visibleH - 80
            setContentOverflows(overflows)
            setIsScrolledToBottom(!overflows)
            setContentMeasured(true)
          }}
        >
          {/* Context blocks (heading, paragraph, tip) */}
          {step.contextBlocks.map((block, i) => (
            <View key={block.id || i} style={{ marginBottom: 16, maxWidth: '100%', overflow: 'hidden' }}>
              {renderBlock(block, undefined, () => {}, undefined, true, t, locale)}
            </View>
          ))}

          {/* Question block */}
          {step.questionBlock && (
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 24,
              padding: 20,
              marginTop: step.contextBlocks.length > 0 ? 8 : 0,
              overflow: 'hidden',
              alignSelf: 'stretch',
            }}>
              {renderBlock(
                step.questionBlock,
                responses[step.questionBlock.id],
                (v) => onResponseChange(step.questionBlock.id, v),
                undefined,
                isCompleted,
                t,
                locale,
              )}
            </View>
          )}

          {/* Info slide */}
          {!step.questionBlock && step.contextBlocks.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>
                {locale === 'fr' ? 'Pas de contenu' : 'No content'}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Scroll hint + arrow when content overflows */}
      {!isCompleted && contentMeasured && contentOverflows && !isScrolledToBottom && (
        <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
          {showScrollHint ? (
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.25)',
              borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                {locale === 'fr' ? '↓ Faites défiler pour continuer' : '↓ Scroll to continue'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowScrollHint(true)}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.2)',
                justifyContent: 'center', alignItems: 'center',
              }}
            >
              <ChevronDown size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bottom navigation — shown only after measurement confirms no overflow, or user scrolled to bottom */}
      {!isCompleted && contentMeasured && (!contentOverflows || isScrolledToBottom) && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: 36,
          flexDirection: 'row',
          gap: 12,
        }}>
          <TouchableOpacity
            onPress={goBack}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: 'rgba(0,0,0,0.15)',
              borderRadius: 28,
              paddingVertical: 14,
            }}
          >
            <ChevronLeft size={16} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
              {isFirst ? (locale === 'fr' ? 'Fermer' : 'Close') : (locale === 'fr' ? 'Retour' : 'Back')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goNext}
            disabled={!canProceed || (isLast && submitting)}
            style={{
              flex: 1.5,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: canProceed ? '#fff' : 'rgba(255,255,255,0.3)',
              borderRadius: 28,
              paddingVertical: 14,
              opacity: canProceed ? 1 : 0.5,
            }}
          >
            {isLast && submitting ? (
              <ActivityIndicator size="small" color={step.color} />
            ) : (
              <>
                <Text style={{ fontSize: 14, fontWeight: '700', color: step.color }}>
                  {isLast
                    ? (locale === 'fr' ? 'Soumettre' : 'Submit')
                    : (locale === 'fr' ? 'Suivant' : 'Next')}
                </Text>
                {!isLast && <ChevronRight size={16} color={step.color} />}
                {isLast && <Check size={16} color={step.color} />}
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Completed navigation */}
      {isCompleted && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: 36,
          flexDirection: 'row',
          gap: 12,
        }}>
          {!isFirst && (
            <TouchableOpacity
              onPress={goBack}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: 'rgba(0,0,0,0.15)',
                borderRadius: 28,
                paddingVertical: 14,
              }}
            >
              <ChevronLeft size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{locale === 'fr' ? 'Retour' : 'Back'}</Text>
            </TouchableOpacity>
          )}
          {!isLast ? (
            <TouchableOpacity
              onPress={() => animateTransition('next', () => setCurrentStep(prev => prev + 1))}
              style={{
                flex: 1.5,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: '#fff',
                borderRadius: 28,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: step.color }}>{locale === 'fr' ? 'Suivant' : 'Next'}</Text>
              <ChevronRight size={16} color={step.color} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: '#fff',
                borderRadius: 28,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: step.color }}>{locale === 'fr' ? 'Terminé' : 'Done'}</Text>
              <Check size={16} color={step.color} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}
