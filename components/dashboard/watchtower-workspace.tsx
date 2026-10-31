'use client'

import Link from 'next/link'
import {
  ArrowUpRight, Building2, FlaskConical, Network, ShieldCheck, Wheat,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useOrganization } from '@/hooks/use-organization'
import { WatchtowerFoodCommandCenter } from '@/components/dashboard/watchtower/food-command-center'
import { WatchtowerScenarioRoom } from '@/components/dashboard/watchtower/scenario-room'
import { WatchtowerOperationsPulse } from '@/components/dashboard/watchtower/operations-pulse'

/**
 * NFII 2.0 Food Resilience Operating Picture.
 *
 * Information architecture is informed by the user's ICPS reference:
 * situation awareness -> purchasing triage -> supply network -> simulation.
 * All actual operational numbers remain sourced from reviewed organization data.
 * Missing external feeds are labelled not integrated, not assigned mock values.
 */
export function WatchtowerWorkspace() {
  const { locale } = useI18n()
  const { organization } = useOrganization()
  const ar = locale === 'ar'
  const tx = (english: string, arabic: string) => ar ? arabic : english

  const sections = [
    { id: 'watchtower-food', name: tx('Food situation', 'الوضع الغذائي'), icon: Wheat },
    { id: 'watchtower-response', name: tx('Procurement & risk', 'المشتريات والمخاطر'), icon: Network },
    { id: 'watchtower-operations', name: tx('Supply network', 'شبكة الإمداد'), icon: Network },
    { id: 'watchtower-scenarios', name: tx('Scenario room', 'غرفة السيناريوهات'), icon: FlaskConical },
  ] as const

  return (
    <main className="growa nfii-command-scope h-full overflow-y-auto bg-background text-content">
      <div className="mx-auto max-w-[1600px] space-y-4 p-4 pb-12 sm:p-6">
        <header className="relative overflow-hidden rounded-md border border-[#22303f] bg-[#040a14] text-[#f0f5fa]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-72 w-96 rounded-full bg-[#274c6d]/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/4 h-48 w-80 rounded-full bg-[#70c0a0]/10 blur-3xl" />

          <div className="relative space-y-4 px-5 pb-4 pt-5 md:px-6 md:pb-5 md:pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.19em]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[#3b617c] bg-[#132940] text-[#70c0a0]">
                  <Wheat className="h-3.5 w-3.5" strokeWidth={1.7} />
                </span>
                <span className="text-[#70c0a0]">NFII / QATAR</span>
                <span className="text-[#536e86]">/</span>
                <span className="text-[#9ab1c9]">{tx('FOOD RESILIENCE OS', 'نظام مرونة الإمداد الغذائي')}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#335b68] bg-[#112d31]/60 px-2 py-1 text-[10px] text-[#a9e7d0]">
                <ShieldCheck className="h-3.5 w-3.5" />
                {tx('REVIEWED DATA MODE', 'وضع البيانات المُراجعة')}
              </span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-[770px] space-y-2">
                <h1 className="text-[26px] font-light tracking-tight md:text-[34px]">
                  {tx('Food Security Watchtower', 'برج مراقبة الأمن الغذائي')}
                </h1>
                <p className="max-w-[78ch] text-[12px] leading-relaxed text-[#a5b7cc] md:text-[13px]">
                  {tx(
                    'National food intelligence architecture: commodity availability, procurement risk, strategic supply readiness and disruption response. Real indicators are restricted to verified sources from your organization.',
                    'بنية معلومات الأمن الغذائي الوطنية: توافر السلع ومخاطر المشتريات وجاهزية الإمداد الاستراتيجي والاستجابة للاضطرابات. تقتصر المؤشرات على مصادر مؤسستك التي تمت مراجعتها.'
                  )}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <span className="flex items-center gap-1.5 text-[11px] text-[#b6c8d8]">
                  <Building2 className="h-3.5 w-3.5 text-[#70c0a0]" />
                  {organization?.name ?? tx('Organization not selected', 'لم تُحدد المؤسسة')}
                </span>
                <span className="rounded-sm border border-[#4f627c] bg-[#182739] px-2 py-1 text-[10px] text-[#bacce0]">
                  {tx('ORGANIZATION SCOPE · NOT NATIONAL TOTALS', 'نطاق المؤسسة · ليست إجماليات وطنية')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 border-t border-[#294058] pt-4">
              {sections.map((section, index) => {
                const Icon = section.icon
                return (
                  <a
                    key={section.id}
                    href={'#' + section.id}
                    className={
                      'inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-[11px] font-medium transition-colors hover:border-[#70c0a0] hover:text-white ' +
                      (index === 0
                        ? 'border-[#46687a] bg-[#213c4c] text-[#d1eee1]'
                        : 'border-[#284259] bg-[#12263a] text-[#aec1d6]')
                    }
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden="true" />
                    {section.name}
                  </a>
                )
              })}
              <Link href="/dashboard/procurement"
                className="inline-flex items-center gap-1 rounded-sm border border-[#35536c] bg-[#12283b] px-3 py-2 text-[11px] text-[#b0e4d1] hover:border-[#70c0a0]">
                {tx('Procurement', 'المشتريات')} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/dashboard/logistics"
                className="inline-flex items-center gap-1 rounded-sm border border-[#35536c] bg-[#12283b] px-3 py-2 text-[11px] text-[#b0e4d1] hover:border-[#70c0a0]">
                {tx('Logistics', 'الخدمات اللوجستية')} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/dashboard/reserves"
                className="inline-flex items-center gap-1 rounded-sm border border-[#35536c] bg-[#12283b] px-3 py-2 text-[11px] text-[#b0e4d1] hover:border-[#70c0a0]">
                {tx('Reserves', 'الاحتياطيات')} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/dashboard?module=commodities"
                className="ms-auto inline-flex items-center gap-1.5 px-2 py-2 text-[11px] font-medium text-[#a5e0c9] hover:underline">
                {tx('Commodity intelligence', 'تحليل السلع')}
                <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
        </header>

        <WatchtowerFoodCommandCenter />

        <WatchtowerOperationsPulse />

        <WatchtowerScenarioRoom />

        <footer className="flex flex-wrap items-start gap-2 border-t border-dotted border-line pt-3 text-[11px] text-content-soft">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p className="max-w-[115ch]">
            {tx(
              'Decision support only. Source review is not certification by Qatar authorities. Procurement, ports, warehouses and agency-level network feeds must be connected and authorized before they can inform operational execution. Simulation does not change live records.',
              'لدعم القرار فقط. مراجعة المصدر ليست اعتماداً من الجهات القطرية. يجب ربط مصادر المشتريات والموانئ والمستودعات والجهات المعنية والتحقق من صلاحياتها قبل أي تنفيذ. لا تغير المحاكاة السجلات الفعلية.'
            )}
          </p>
        </footer>
      </div>
    </main>
  )
}
