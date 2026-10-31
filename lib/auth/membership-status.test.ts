import { describe, expect, it } from 'vitest'
import { isActiveMembershipStatus } from '@/lib/auth/membership-status'

describe('isActiveMembershipStatus', () => {
  it('treats inactive memberships as blocked', () => {
    expect(isActiveMembershipStatus('inactive')).toBe(false)
  })

  it('allows active and invited memberships', () => {
    expect(isActiveMembershipStatus('active')).toBe(true)
    expect(isActiveMembershipStatus('invited')).toBe(true)
    expect(isActiveMembershipStatus(undefined)).toBe(true)
  })
})
