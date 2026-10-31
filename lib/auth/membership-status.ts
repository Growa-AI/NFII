export function isActiveMembershipStatus(status: string | null | undefined): boolean {
  return (status ?? 'active').toLowerCase() !== 'inactive'
}
