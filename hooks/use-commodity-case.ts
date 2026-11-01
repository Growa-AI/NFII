'use client'

import { useEffect, useMemo, useState } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { calculateFoodBalance, type FoodBalanceResult } from '@/lib/food-security/balance'
import { buildQatarIllustrativeFoodBalanceInput } from '@/lib/food-security/demo-data'
import {
  EMPTY_OPERATIONS, previewOperationsSnapshot,
  type OperationsResponse, type OperationsSnapshot,
} from '@/lib/nfii/operations-types'

export type CommodityDataSelection = 'auto' | 'live' | 'example'

function qatarToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return part('year') + '-' + part('month') + '-' + part('day')
}

type FoodResponse = {
  balance?: FoodBalanceResult
  dataSource?: 'LIVE' | 'DEMO'
  error?: string
}

/**
 * Single source of truth for Commodity Intelligence and the agent workbench.
 *
 * Explicit source separation is critical: real balances are never combined
 * with illustrative supplier shipments/lots as if they were reconciled.
 * The existing seed preview is in-memory and never written to Supabase.
 */
export function useCommodityCase(commodityId: string, days: 7 | 30 | 90 | 180) {
  const { organization, loading: organizationLoading } = useOrganization()
  const organizationId = organization?.id ?? null
  const [selection, setSelection] = useState<CommodityDataSelection>('auto')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [liveBalance, setLiveBalance] = useState<FoodBalanceResult | null>(null)
  const [liveOperations, setLiveOperations] = useState<OperationsSnapshot | null>(null)
  const [foodError, setFoodError] = useState<string | null>(null)
  const [operationsError, setOperationsError] = useState<string | null>(null)

  const today = qatarToday()
  const exampleBalance = useMemo(
    () => calculateFoodBalance(buildQatarIllustrativeFoodBalanceInput(commodityId, today, days)),
    [commodityId, today, days],
  )
  const exampleOperations = useMemo(() => previewOperationsSnapshot(today), [today])

  useEffect(() => {
    setLiveBalance(null)
    setLiveOperations(null)
    setFoodError(null)
    setOperationsError(null)
    if (!organizationId || organizationLoading) {
      setLoading(false)
      return
    }
    const abort = new AbortController()
    const load = async () => {
      setLoading(true)
      const [food, operations] = await Promise.allSettled([
        fetch('/api/food-security/balance?' + new URLSearchParams({
          organizationId, commodityId, days: String(days), mode: 'live',
        }), { cache: 'no-store', signal: abort.signal })
          .then(async res => {
            const body = await res.json() as FoodResponse
            if (!res.ok) throw new Error(body.error ?? 'Food balance unavailable')
            if (!body.balance || body.dataSource !== 'LIVE' ||
                body.balance.commodityId !== commodityId ||
                body.balance.sourceMode !== 'live' || body.balance.days !== days) {
              throw new Error('Unexpected food-balance scope or period')
            }
            return body.balance
          }),
        fetch('/api/nfii/operations?' + new URLSearchParams({organizationId}), {
          cache: 'no-store', signal: abort.signal,
        }).then(async res => {
          const body = await res.json() as Partial<OperationsResponse> & {error?: string}
          if (!res.ok) throw new Error(body.error ?? 'Operational sources unavailable')
          if (body.scope !== 'organization' || body.organizationId !== organizationId ||
              body.dataSource !== 'database' || !body.snapshot) {
            throw new Error('Unexpected operational organization scope')
          }
          return body.snapshot
        }),
      ])
      if (abort.signal.aborted) return
      if (food.status === 'fulfilled') setLiveBalance(food.value)
      else setFoodError(food.reason instanceof Error ? food.reason.message : 'Food data unavailable')
      if (operations.status === 'fulfilled') setLiveOperations(operations.value)
      else setOperationsError(
        operations.reason instanceof Error ? operations.reason.message : 'Operational data unavailable',
      )
      setLoading(false)
    }
    void load()
    return () => abort.abort()
  }, [organizationId, organizationLoading, commodityId, days, refreshKey])

  const effectiveBalance = liveBalance?.commodityId === commodityId &&
    liveBalance.days === days && liveBalance.sourceMode === 'live' ? liveBalance : null

  const mode: 'example' | 'live' = selection === 'example' ? 'example' :
    selection === 'live' ? 'live' :
    effectiveBalance?.status === 'complete' ? 'live' : 'example'

  const balance = mode === 'example' ? exampleBalance : effectiveBalance
  const operations = mode === 'example' ? exampleOperations : liveOperations ?? EMPTY_OPERATIONS

  return {
    balance,
    operations,
    mode,
    selection,
    setSelection,
    organization,
    organizationId,
    organizationLoading,
    loading,
    foodError,
    operationsError,
    hasVerifiedBalance: effectiveBalance?.status === 'complete',
    hasLiveOperations: liveOperations !== null,
    refresh: () => setRefreshKey(n => n + 1),
    today,
  }
}
