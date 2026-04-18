import { useState, useRef, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from 'react-native'
import { ChevronLeft, ChevronRight, Check, Save, X } from 'lucide-react-native'
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
  'callout', 'image', 'video', 'audio', 'link',
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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

  const animateTransition = useCallback((direction: 'next' | 'back', callback: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      callback()
      scrollRef.current?.scrollTo({ y: 0, animated: false })
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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header: progress bar + save draft */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff' }}>
        {/* Close + step counter + save */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>
            {currentStep + 1} / {totalSteps}
          </Text>
          {onSaveDraft && draftResponseId && !isCompleted && (
            <TouchableOpacity onPress={onSaveDraft} disabled={saving} style={{ padding: 4 }}>
              <Save size={18} color={saving ? '#D1D5DB' : '#6B7280'} />
            </TouchableOpacity>
          )}
          {(!onSaveDraft || !draftResponseId || isCompleted) && <View style={{ width: 28 }} />}
        </View>

        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: '#F3F4F6', borderRadius: 2 }}>
          <View style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: step.color,
            width: `${((currentStep + 1) / totalSteps) * 100}%`,
          }} />
        </View>
      </View>

      {/* Step content */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Colored card */}
          <View style={{
            backgroundColor: hexToRgba(step.color, 0.06),
            borderRadius: 24,
            padding: 24,
            borderWidth: 1.5,
            borderColor: hexToRgba(step.color, 0.15),
            minHeight: 200,
          }}>
            {/* Context blocks (heading, paragraph, tip, etc.) */}
            {step.contextBlocks.map((block, i) => (
              <View key={block.id || i} style={{ marginBottom: 16 }}>
                {renderBlock(block, undefined, () => {}, undefined, true, t, locale)}
              </View>
            ))}

            {/* Question block */}
            {step.questionBlock && (
              <View style={{ marginTop: step.contextBlocks.length > 0 ? 8 : 0 }}>
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

            {/* Info slide (no question) */}
            {!step.questionBlock && step.contextBlocks.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 16, color: '#9CA3AF' }}>
                  {locale === 'fr' ? 'Pas de contenu' : 'No content'}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom navigation */}
      {!isCompleted && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: 32,
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
              borderWidth: 1.5,
              borderColor: '#E5E7EB',
              borderRadius: 28,
              paddingVertical: 14,
            }}
          >
            <ChevronLeft size={16} color="#6B7280" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>
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
              backgroundColor: canProceed ? step.color : '#D1D5DB',
              borderRadius: 28,
              paddingVertical: 14,
              opacity: canProceed ? 1 : 0.5,
            }}
          >
            {isLast && submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  {isLast
                    ? (locale === 'fr' ? 'Soumettre' : 'Submit')
                    : (locale === 'fr' ? 'Suivant' : 'Next')}
                </Text>
                {!isLast && <ChevronRight size={16} color="#fff" />}
                {isLast && <Check size={16} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Completed state */}
      {isCompleted && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: 32,
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
                borderWidth: 1.5,
                borderColor: '#E5E7EB',
                borderRadius: 28,
                paddingVertical: 14,
              }}
            >
              <ChevronLeft size={16} color="#6B7280" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>
                {locale === 'fr' ? 'Retour' : 'Back'}
              </Text>
            </TouchableOpacity>
          )}
          {!isLast && (
            <TouchableOpacity
              onPress={() => animateTransition('next', () => setCurrentStep(prev => prev + 1))}
              style={{
                flex: 1.5,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: step.color,
                borderRadius: 28,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                {locale === 'fr' ? 'Suivant' : 'Next'}
              </Text>
              <ChevronRight size={16} color="#fff" />
            </TouchableOpacity>
          )}
          {isLast && (
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: step.color,
                borderRadius: 28,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                {locale === 'fr' ? 'Terminé' : 'Done'}
              </Text>
              <Check size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}
