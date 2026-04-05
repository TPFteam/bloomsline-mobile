// Get the nav bar order for a member
// Returns ['moments', 'practitioner', 'stories'] or similar
export function getNavOrder(member: { practitioner_id?: string; nav_order?: string[] | null } | null): string[] {
  if (member?.nav_order && Array.isArray(member.nav_order) && member.nav_order.length === 3) {
    return member.nav_order
  }
  // Default: always moments first
  return ['moments', 'practitioner', 'stories']
}

// Get which screen should be the home (first in order)
export function getHomeScreen(member: { practitioner_id?: string; nav_order?: string[] | null } | null): string {
  const order = getNavOrder(member)
  return order[0]
}
