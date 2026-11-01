import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe,expect,it} from 'vitest'

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8')
const route=read('app/api/nfii/procurement/crop-producers/route.ts')
const ui=read('components/dashboard/nfii-ops/crop-producer-discovery.tsx')
const workspace=read('components/dashboard/nfii-ops/operations-workspace.tsx')
const old=read('components/dashboard/nfii-ops/global-supplier-research.tsx')
const source=read('lib/nfii/crop-producer-directory.ts')

describe('Crop-first, evidence-led Procurement discovery',()=>{
  it('makes crop selection the primary search, with company-name search secondary',()=>{
    expect(ui).toContain('Select crop / food product')
    expect(ui).toContain('Find crop matches')
    expect(ui).toContain('No company-name keyword is required.')
    expect(workspace).toContain('<CropProducerDiscovery organizationId={orgId}/>')
    expect(workspace.indexOf('<CropProducerDiscovery')).toBeLessThan(
      workspace.indexOf('<GlobalSupplierResearch'))
    expect(workspace).toContain('<details className="nfii-panel group p-4 md:p-5">')
    expect(workspace).toContain('Additional research: legal entities, import markets and business leads')
    expect(old).toContain('Global supplier research')
  })
  it('clearly indicates that publication does not verify grower status or live certificates',()=>{
    expect(ui).not.toContain('Grower role: CONFIRMED')
    expect(ui).toContain('Grower role: NOT independently confirmed')
    expect(ui).toContain('LIMITED PUBLISHED EXCERPT · NOT LIVE')
    expect(ui).toContain('not a complete world inventory')
    expect(ui).toContain('No documented match in this limited excerpt')
    expect(source).toContain("cropGrowerConfirmed:false")
    expect(source).toContain("currentCertificateConfirmed:false")
    expect(source).toContain("capacityTonnes:null")
  })
  it('never creates supplier, approval, RFQ or orders from a directory match',()=>{
    expect(route).toContain('supabase.auth.getUser()')
    expect(route).toContain("requireCapability('supply.view',organizationId)")
    expect(route).toContain('completeGlobalCoverage:false')
    expect(route).toContain('liveCertificateVerified:false')
    expect(route).not.toContain('createAdminClient')
    expect(route).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/)
    expect(ui).not.toContain('onPrepareSupplier')
    expect(ui).not.toContain('method: \'POST\'')
    expect(ui).toContain('Nothing is added to the approved supplier registry or Supabase.')
  })
  it('connects users to primary certification directories for broader searches',()=>{
    expect(ui).toContain('USDA Organic INTEGRITY')
    expect(ui).toContain('GLOBALG.A.P.')
    expect(source).toContain('https://www.fairtsa.org/products')
    expect(source).toContain('https://organic.ams.usda.gov/integrity/')
    expect(source).toContain('https://globalgap.org/what-we-offer/globalgap-it-platform/')
    expect(ui).toContain('The bundled excerpt has limited coverage.')
  })
})
