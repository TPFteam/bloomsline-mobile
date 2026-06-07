export type MobileFeatures = {
  moments?: boolean
  stories?: boolean
  my_care?: boolean
  stories_shareable?: boolean
  talk_to_bloom?: boolean
}

// Map nav keys to mobile_features keys
const NAV_TO_FEATURE: Record<string, keyof MobileFeatures> = {
  moments: 'moments',
  practitioner: 'my_care',
  stories: 'stories',
}

// Get the nav bar order for a member, filtered by practitioner's mobile_features
export function getNavOrder(
  member: { practitioner_id?: string; nav_order?: string[] | null } | null,
  mobileFeatures?: MobileFeatures | null,
): string[] {
  let order: string[]
  if (member?.nav_order && Array.isArray(member.nav_order) && member.nav_order.length === 3) {
    order = member.nav_order
  } else if (member?.practitioner_id) {
    // Practitioner-invited users default to My Care first
    order = ['practitioner', 'moments', 'stories']
  } else {
    order = ['moments', 'practitioner', 'stories']
  }

  // Filter by practitioner's mobile_features (if provided)
  if (mobileFeatures) {
    order = order.filter(key => {
      const featureKey = NAV_TO_FEATURE[key]
      return !featureKey || mobileFeatures[featureKey] !== false
    })
  }

  // Journal ("stories") now lives inside the For You hub, not the bottom nav.
  order = order.filter(k => k !== 'stories')

  // "For You" is always present, appended after Moments / My Care.
  if (!order.includes('forYou')) order = [...order, 'forYou']

  return order
}

// Get which screen should be the home (first in order)
export function getHomeScreen(
  member: { practitioner_id?: string; nav_order?: string[] | null } | null,
  mobileFeatures?: MobileFeatures | null,
): string {
  const order = getNavOrder(member, mobileFeatures)
  return order[0] || 'moments'
}
