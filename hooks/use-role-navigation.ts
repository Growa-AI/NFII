'use client'

/*
 * Resolves who the user is for navigation purposes — the effective role and,
 * for ministry roles, the ministry profile — and hands back the menu built
 * by the registry (`lib/navigation/registry.ts`).
 *
 * Use it through `useSharedRoleNavigation()` (one instance per dashboard).
 */

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useOrganization } from '@/hooks/use-organization'
import { usePermissions } from '@/hooks/use-permissions'
import { usePlatformCapabilities } from '@/hooks/use-platform-capabilities'
import {
  buildNavigation,
  ministryProfileForRole,
  type MinistryRoleProfile,
} from '@/lib/navigation/registry'

interface RoleState {
  effectiveRole: string | null
  roleProfile: MinistryRoleProfile | null
}

export function useRoleNavigation() {
  const { user } = useAuth()
  const { organization } = useOrganization()
  const { getUserRole } = usePermissions()
  const { isPlatformAdmin, rolePreviewActive, previewRole } = usePlatformCapabilities()
  const [role, setRole] = useState<RoleState>({ effectiveRole: null, roleProfile: null })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolveRole(): Promise<RoleState> {
      if (!user) return { effectiveRole: null, roleProfile: null }

      if (isPlatformAdmin && rolePreviewActive && previewRole) {
        return { effectiveRole: previewRole, roleProfile: ministryProfileForRole(previewRole) }
      }

      if (isPlatformAdmin && !rolePreviewActive) {
        return { effectiveRole: 'normal_user', roleProfile: null }
      }

      const currentRole: string | null = organization?.id ? await getUserRole(organization.id) : null
      return { effectiveRole: currentRole, roleProfile: ministryProfileForRole(currentRole) }
    }

    setIsLoading(true)
    resolveRole()
      .then((next) => {
        if (cancelled) return
        setRole(next)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[navigation] role resolution failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to resolve role')
        setRole({ effectiveRole: null, roleProfile: null })
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, organization?.id, getUserRole, isPlatformAdmin, rolePreviewActive, previewRole])

  return useMemo(() => {
    const navigation = buildNavigation(role.effectiveRole, role.roleProfile)
    return {
      ...role,
      navigation,
      landingPage: navigation.landing,
      isLoading,
      error,
      isMinistryWorkspace: role.roleProfile !== null,
    }
  }, [role, isLoading, error])
}
