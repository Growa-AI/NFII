import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {requireCapability} from '@/lib/auth/require-capability'
import {validFoodUuid} from '@/lib/food-security/ingestion'
import {
  cropProducerCoverage,FAIRTSA_EXCERPT_CHECKED,FAIRTSA_REGISTRY_URL,
  findDocumentedCropOrganizations,GLOBALGAP_REGISTRY_URL,
  USDA_ORGANIC_REGISTRY_URL,validateCropProducerSearch,
} from '@/lib/nfii/crop-producer-directory'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const reply=(body:unknown,status=200)=>NextResponse.json(body,{
  status,headers:{'Cache-Control':'private, no-store, max-age=0'},
})

/**
 * Returns a curated, bounded multi-publisher directory with exact crop or
 * crop-sector evidence. Historical listings, not a live certification API.
 */
export async function GET(request:Request){
  const params=new URL(request.url).searchParams
  const parsed=validateCropProducerSearch(params)
  if(!parsed.ok)return reply({error:parsed.error},400)
  const organizationId=(params.get('organizationId')??'').trim()
  if(organizationId&&!validFoodUuid(organizationId))
    return reply({error:'Invalid organizationId'},400)

  const supabase=await createClient()
  const {data:{user},error}=await supabase.auth.getUser()
  if(error||!user)return reply({error:'Sign in to research certified products'},401)
  if(organizationId){
    const access=await requireCapability('supply.view',organizationId)
    if(!access.ok)return reply({error:access.error},access.status)
  }

  const results=findDocumentedCropOrganizations(parsed.commodity,parsed.country)
  return reply({
    provider:'crop-sector-directory',
    commodity:parsed.commodity,
    country:parsed.country,
    retrievedAt:new Date().toISOString(),
    excerptCheckedOn:FAIRTSA_EXCERPT_CHECKED,
    source:'Attributed published crop-sector registries',
    sourceUrl:FAIRTSA_REGISTRY_URL,
    sourceCount:new Set(results.map(row=>row.sourceUrl)).size,
    countryCount:new Set(results.map(row=>row.countryCode)).size,
    evidenceBreakdown:Object.fromEntries([...new Set(results.map(row=>row.evidenceType))].map(type=>[
      type,results.filter(row=>row.evidenceType===type).length])),
    results,
    sourceCoverage:cropProducerCoverage(),
    completeGlobalCoverage:false,
    liveCertificateVerified:false,
    note:'Curated documented sourcing leads from several published directories, NOT a live ' +
      'global supplier census or current independent verification. Association membership, ' +
      'market listings, product certificates and national marks have DIFFERENT evidentiary strength. ' +
      'They do not prove own-farm production, current certification, export eligibility, ' +
      'capacity, stock or contract availability. Verify each individual original source.',
    independentSources:[
      {label:'USDA Organic INTEGRITY - certified operations and products',
        url:USDA_ORGANIC_REGISTRY_URL,
        description:'Use certified product and CROPS scope; USDA-NOP operators only.'},
      {label:'GLOBALG.A.P. IT platform - product and producer certification',
        url:GLOBALGAP_REGISTRY_URL,
        description:'Public records vary by producer access rules; API requires a subscription.'},
    ],
  })
}
