import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MobileFeatures } from '@/lib/nav-order'

export function useMobileFeatures(practitionerId: string | undefined | null): MobileFeatures | null {
  const [features, setFeatures] = useState<MobileFeatures | null>(null)

  useEffect(() => {
    if (!practitionerId) return

    supabase
      .from('users')
      .select('mobile_features')
      .eq('id', practitionerId)
      .single()
      .then(({ data }) => {
        if (data?.mobile_features) setFeatures(data.mobile_features)
      })
  }, [practitionerId])

  return features
}
