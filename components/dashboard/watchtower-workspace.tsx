'use client'

import Link from 'next/link'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/brand/layout'
import { WatchtowerFoodCommandCenter } from '@/components/dashboard/watchtower/food-command-center'
import { WatchtowerScenarioRoom } from '@/components/dashboard/watchtower/scenario-room'
import { useI18n } from '@/lib/i18n'

/**
 * NFII Food Security Watchtower.
 * The former generic agricultural-monitoring layout belongs in the
 * dedicated farming/monitoring modules, not in the food security command room.
 *
 * All visible food metrics come from tenant-scoped, independently reviewed
 * sources. No demo fallback or LLM-generated operational numbers.
 */
export function WatchtowerWorkspace() {
  const { locale } = useI18n()
  const ar = locale === 'ar'
  const tx = (english: string, arabic: string) => ar ? arabic : english

  return (
    <main className="growa h-full overflow-y-auto bg-background text-content">
      <div className="mx-auto max-w-[1600px] space-y-4 p-6 pb-12">
        <PageHeader
          eyebrow={tx('NFII 2.0 · FOOD SECURITY INTELLIGENCE', 'البنية الوطنية للمعلومات الغذائية · 2.0')}
          title={tx('Food Security Watchtower', 'برج مراقبة الأمن الغذائي')}
          subtitle={tx(
            'Command view for verified food availability, supply gaps, source reliability and disruption scenarios.',
            'واجهة متابعة توافر الغذاء الموثق وفجوات الإمداد وموثوقية المصادر وسيناريوهات الاضطراب.'
          )}
          actions={
            <Link
              href="/dashboard?module=commodities"
              className="inline-flex items-center gap-2 rounded-md border border-line bg-card px-3 py-2 text-[12px] font-medium text-content hover:bg-muted"
            >
              {tx('Commodity intelligence', 'تحليل السلع')}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          }
          className="!mb-2"
        />

        <WatchtowerFoodCommandCenter />

        <WatchtowerScenarioRoom />

        <footer className="flex flex-wrap items-start gap-2 border-t border-dotted border-line pt-3 text-[11px] text-content-soft">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p className="max-w-[110ch]">
            {tx(
              'Food intelligence on this screen is limited to the selected authorized organization. Reviewed source records are not automatically certified national statistics. Forecast sensitivity tests cannot change live inventory, imports, procurement or approval status.',
              'تقتصر البيانات هنا على المؤسسة المحددة والمصرح بها. السجلات المُراجعة ليست تلقائياً إحصاءات وطنية معتمدة. لا تغير اختبارات السيناريو المخزون الفعلي أو الواردات أو المشتريات أو حالات الموافقة.'
            )}
          </p>
        </footer>
      </div>
    </main>
  )
}
