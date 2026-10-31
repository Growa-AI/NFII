import { NextRequest } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization-service'
import { jsonError, jsonOk } from '@/lib/api/json-response'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { writeSecurityAudit } from '@/lib/auth/audit-server'
import { canRemoveMembership } from '@/lib/auth/membership-authorization'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ membershipId: string }> }
) {
  const { membershipId } = await context.params
  const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim()

  if (!organizationId) {
    return jsonError('organizationId is required', 400)
  }

  const gate = await requirePermission('users.manage', organizationId)
  if (!gate.allowed || !gate.context) {
    return jsonError('Forbidden', gate.status === 401 ? 401 : 403)
  }

  if (!isAdminClientConfigured()) {
    return jsonError('Membership service not configured', 503)
  }

  const admin = createAdminClient()
  const { data: row, error: fetchError } = await admin
    .from('user_organization_members')
    .select('id, user_id, role, organization_id')
    .eq('id', membershipId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (fetchError || !row) {
    return jsonError('Membership not found', 404)
  }

  const { count } = await admin
    .from('user_organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('role', ['owner', 'super_admin'])

  if (
    !canRemoveMembership({
      actorUserId: gate.context.userId,
      actorRole: gate.context.authorization.effectiveOrgRole,
      targetUserId: row.user_id,
      targetRole: row.role,
      ownerCountInOrg: count ?? 1,
      isPlatformAdmin: Boolean(gate.context.authorization.platformStaffTier),
    })
  ) {
    return jsonError('Cannot remove this member', 403)
  }

  const { error } = await admin
    .from('user_organization_members')
    .update({ status: 'inactive' })
    .eq('id', membershipId)

  if (error) {
    return jsonError(error.message, 500)
  }

  await writeSecurityAudit({
    actorId: gate.context.userId,
    organizationId,
    action: 'membership_removed',
    resourceType: 'user_organization_member',
    resourceId: membershipId,
    metadata: { targetUserId: row.user_id },
  })

  return jsonOk({ removed: true })
}
