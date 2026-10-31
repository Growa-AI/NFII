'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'
import { isActiveMembershipStatus } from '@/lib/auth/membership-status'

export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  type?: string | null
  organization_type?: string | null
}

type OrganizationState = { organization: Organization | null; organizations: Organization[] }

/* One lookup per signed-in user, shared by every caller. The hook runs in the
   rail, the header, the map and most screens: each instance used to run the
   same one-to-four Supabase queries on its own. */
const organizationRequests = new Map<string, Promise<OrganizationState>>()

/** Forget the cached organisation (after creating one or switching context). */
export function invalidateOrganizationCache() {
  organizationRequests.clear()
}

async function loadRolePreviewOrg(
  supabase: ReturnType<typeof createClient>
): Promise<Organization | null> {
  const { data: caps } = await supabase.rpc('get_my_auth_capabilities')
  const row = (Array.isArray(caps) ? caps[0] : caps) as
    | { role_preview_active?: boolean; preview_org_id?: string | null; is_platform_admin?: boolean }
    | undefined

  if (!row?.is_platform_admin || !row.role_preview_active || !row.preview_org_id) {
    return null
  }

  const { data: previewOrg, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', row.preview_org_id)
    .maybeSingle()

  if (error || !previewOrg) return null
  return previewOrg as Organization
}

async function loadOrganizations(
  supabase: ReturnType<typeof createClient>,
  user: { id: string; email?: string | null }
): Promise<OrganizationState> {
  const previewOrg = await loadRolePreviewOrg(supabase)
  if (previewOrg) {
    return { organization: previewOrg, organizations: [previewOrg] }
  }

  // Get organizations where user is a member
  const { data: memberships, error: memberError } = await supabase
    .from('user_organization_members')
    .select('organization_id, status')
    .eq('user_id', user.id)

  if (memberError) throw memberError
  const activeMemberships = (memberships || []).filter((m) =>
    isActiveMembershipStatus((m as { status?: string }).status)
  )
  if (activeMemberships.length === 0) return { organization: null, organizations: [] }

  const orgIds = activeMemberships.map((m) => m.organization_id)
  const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*').in('id', orgIds)
  if (orgsError) throw orgsError

  return { organization: orgs?.[0] ?? null, organizations: orgs || [] }
}

export function useOrganization() {
  const { user } = useAuth()
  const [state, setState] = useState<OrganizationState>({ organization: null, organizations: [] })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false
    let request = organizationRequests.get(user.id)
    if (!request) {
      request = loadOrganizations(supabase, user)
      organizationRequests.set(user.id, request)
      // A failure is not remembered: the next caller tries again.
      request.catch(() => organizationRequests.delete(user.id))
    }

    request
      .then((next) => {
        if (!cancelled) setState(next)
      })
      .catch((error) => {
        console.error('[organization] Error fetching organizations:', error?.code ?? '', error?.message ?? error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, supabase])

  return { organization: state.organization, organizations: state.organizations, loading }
}
