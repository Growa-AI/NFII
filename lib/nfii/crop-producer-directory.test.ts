import {describe,expect,it} from 'vitest'
import {
  cropProducerCoverage,FAIRTSA_EXCERPT_CHECKED,
  FAIRTSA_REGISTRY_URL,findDocumentedCropOrganizations,
  validateCropProducerSearch,
} from './crop-producer-directory'

describe('First-party crop product evidence from FairTSA public directory',()=>{
  it('finds organizations by selected crop rather than guessing from a company name',()=>{
    const rows=findDocumentedCropOrganizations('rice')
    expect(rows).toHaveLength(6)
    expect(rows.map(r=>r.organizationName)).toContain('Ban Um-Sang Rice Community Enterprise')
    expect(rows.map(r=>r.organizationName)).toContain('Kadwara Ecopure Javik Samuha')
    expect(rows.every(r=>r.commodityId==='rice')).toBe(true)
    expect(rows.every(r=>r.matchedProduct.toLowerCase().includes('rice'))).toBe(true)
    expect(rows.every(r=>r.recordId.length>3 && r.certifier.length>2)).toBe(true)
  })
  it('applies country ISO filters before returning published product matches',()=>{
    const india=findDocumentedCropOrganizations('rice','IN')
    const thailand=findDocumentedCropOrganizations('rice','TH')
    expect(india).toHaveLength(3)
    expect(thailand).toHaveLength(3)
    expect(india.every(r=>r.countryCode==='IN')).toBe(true)
    expect(thailand.every(r=>r.countryCode==='TH')).toBe(true)
    expect(findDocumentedCropOrganizations('wheat','TR')).toEqual([])
    expect(findDocumentedCropOrganizations('not-a-crop')).toEqual([])
  })
  it('exposes only supported, exact crop product matches',()=>{
    const coverage=cropProducerCoverage()
    expect(coverage).toEqual({
      tomato:1,cucumber:0,pepper:0,lettuce:0,date:0,
      barley:3,milk:1,rice:6,wheat:2,
    })
    // FairTSA "Pepper" can denote a spice, not Capsicum/bell pepper.
    // Never claim a verified Capsicum producer on this ambiguity.
    expect(findDocumentedCropOrganizations('pepper')).toEqual([])
    expect(findDocumentedCropOrganizations('tomato')[0].organizationName).toBe('Fade Food')
    expect(findDocumentedCropOrganizations('milk')[0].matchedProduct).toContain('Milk')
  })
  it('never asserts that registry-listed organizations grow a crop or have current certificates',()=>{
    for(const id of ['tomato','barley','milk','rice','wheat']){
      for(const record of findDocumentedCropOrganizations(id)){
        expect(record.sourceUrl).toBe(FAIRTSA_REGISTRY_URL)
        expect(record.registryCheckedOn).toBe(FAIRTSA_EXCERPT_CHECKED)
        expect(record.evidenceType).toBe('product_listed_in_certification_directory')
        expect(record.cropGrowerConfirmed).toBe(false)
        expect(record.currentCertificateConfirmed).toBe(false)
        expect(record.exportCapabilityConfirmed).toBe(false)
        expect(record.supplierApproved).toBe(false)
        expect(record.capacityTonnes).toBeNull()
      }
    }
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
