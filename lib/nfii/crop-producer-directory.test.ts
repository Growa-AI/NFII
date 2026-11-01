import {describe,expect,it} from 'vitest'
import {
  cropProducerCoverage,FAIRTSA_EXCERPT_CHECKED,
  findDocumentedCropOrganizations,
  validateCropProducerSearch,
} from './crop-producer-directory'

describe('First-party crop product evidence from FairTSA public directory',()=>{
  it('finds organizations by selected crop rather than guessing from a company name',()=>{
    const rows=findDocumentedCropOrganizations('rice')
    expect(rows.length).toBeGreaterThan(80)
    expect(rows.map(r=>r.organizationName)).toContain('Ban Um-Sang Rice Community Enterprise')
    expect(rows.map(r=>r.organizationName)).toContain('Kadwara Ecopure Javik Samuha')
    expect(rows.every(r=>r.commodityId==='rice')).toBe(true)
    expect(rows.every(r=>/rice/i.test(r.matchedProduct))).toBe(true)
    expect(rows.every(r=>r.recordId.length>3 && r.sourceUrl.startsWith('https://'))).toBe(true)
  })
  it('applies country ISO filters before returning published product matches',()=>{
    const india=findDocumentedCropOrganizations('rice','IN')
    const thailand=findDocumentedCropOrganizations('rice','TH')
    expect(india.length).toBeGreaterThan(40)
    expect(thailand.length).toBeGreaterThan(45)
    expect(india.every(r=>r.countryCode==='IN')).toBe(true)
    expect(thailand.every(r=>r.countryCode==='TH')).toBe(true)
    expect(findDocumentedCropOrganizations('wheat','TR')).toEqual([])
    expect(findDocumentedCropOrganizations('not-a-crop')).toEqual([])
  })
  it('exposes only supported, exact crop product matches',()=>{
    const coverage=cropProducerCoverage()
    expect(coverage.rice).toBeGreaterThan(80)
    expect(coverage.date).toBeGreaterThanOrEqual(12)
    expect(coverage.milk).toBeGreaterThanOrEqual(14)
    expect(coverage.tomato).toBeGreaterThanOrEqual(30)
    expect(coverage.cucumber).toBeGreaterThanOrEqual(30)
    expect(coverage.pepper).toBeGreaterThanOrEqual(30)
    expect(coverage.lettuce).toBeGreaterThanOrEqual(7)
    // FairTSA "Pepper" can denote a spice, not Capsicum/bell pepper.
    // Never claim a verified Capsicum producer on this ambiguity.
    expect(findDocumentedCropOrganizations('pepper').every(row=>
      ['company_product_document','historical_crop_marketer'].includes(row.evidenceType))).toBe(true)
    expect(findDocumentedCropOrganizations('tomato').map(r=>r.organizationName)).toContain('Fade Food')
    expect(findDocumentedCropOrganizations('milk').every(row=>row.matchedProduct.includes('Milk'))).toBe(true)
  })
  it('never asserts that registry-listed organizations grow a crop or have current certificates',()=>{
    for(const id of ['tomato','barley','milk','rice','wheat']){
      for(const record of findDocumentedCropOrganizations(id)){
        expect(record.sourceUrl.startsWith('https://')).toBe(true)
        expect(record.registryCheckedOn).toBe(FAIRTSA_EXCERPT_CHECKED)
        expect(record.evidenceType.length).toBeGreaterThan(8)
        expect(record.cropGrowerConfirmed).toBe(false)
        expect(record.currentCertificateConfirmed).toBe(false)
        expect(record.exportCapabilityConfirmed).toBe(false)
        expect(record.supplierApproved).toBe(false)
        expect(record.capacityTonnes).toBeNull()
      }
    }
  })
  it('provides source attribution and deduplicated companies',()=>{
    const rice=findDocumentedCropOrganizations('rice')
    expect(new Set(rice.map(r=>r.countryCode+'|'+r.organizationName.toLowerCase())).size).toBe(rice.length)
    expect(rice.some(r=>r.sourceName.includes('Thai Rice Exporters'))).toBe(true)
    expect(rice.some(r=>r.sourceName.includes('All India Rice Exporters'))).toBe(true)
    expect(findDocumentedCropOrganizations('date','SA').length).toBeGreaterThanOrEqual(12)
    expect(findDocumentedCropOrganizations('rice','AU')).toEqual([])
  })
  it('accepts only known commodity IDs and ISO two-letter country codes',()=>{
    const ok=validateCropProducerSearch(new URLSearchParams('commodity=tomato&country=tr'))
    expect(ok).toEqual({ok:true,commodity:'tomato',country:'TR'})
    const unknown=validateCropProducerSearch(new URLSearchParams('commodity=potato'))
    const injection=validateCropProducerSearch(new URLSearchParams('commodity=rice&country=%3Cscript%3E'))
    const empty=validateCropProducerSearch(new URLSearchParams())
    expect(unknown.ok).toBe(false)
    expect(injection.ok).toBe(false)
    expect(empty.ok).toBe(false)
  })
})
