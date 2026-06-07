import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MobileFeatures } from '@/lib/nav-order'

const ALL_ENABLED: MobileFeatures = { moments: true, stories: true, my_care: true, affirmations: true, stories_shareable: true, talk_to_bloom: true }

export function useMobileFeatures(practitionerId: string | undefined | null): MobileFeatures | null {
  const [features, setFeatures] = useState<MobileFeatures | null>(null)

  useEffect(() => {
    // No practitioner = waitlist/self-onboarded user → all features enabled
    if (!practitionerId) {
      setFeatures(ALL_ENABLED)
      return
    }

    supabase
      .from('users')
      .select('mobile_features')
      .eq('id', practitionerId)
      .single()
      .then(({ data }) => {
        if (data?.mobile_features) setFeatures(data.mobile_features)
        else setFeatures(ALL_ENABLED)
      })
  }, [practitionerId])

  return features
}
