import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {requireCapability} from '@/lib/auth/require-capability'
import {validFoodUuid} from '@/lib/food-security/ingestion'
import {validateLaneInput,CARGO_SPECS,getExportHub} from '@/lib/nfii/logistics-lanes'
import {collectLogisticsEvidence} from '@/lib/nfii/logistics-providers'
import {buildScreenedRoutes,LOGISTICS_DATA_RULES,type RateInput} from '@/lib/nfii/logistics-screening'
import {countryName} from '@/lib/nfii/world-countries'

export const dynamic='force-dynamic'
export const runtime='nodejs'
const reply=(data:unknown,status=200)=>NextResponse.json(data,{
  status,headers:{'Cache-Control':'private, no-store, max-age=0'},
})

function parseRate(value:string|null):number|null|undefined{
  if(value===null||value.trim()==='')return null
  const n=Number(value)
  if(!Number.isFinite(n)||n<=0||n>=100000)return undefined
  return Math.round(n*100)/100
}

export async function GET(request:Request){
  const params=new URL(request.url).searchParams
  const parsed=validateLaneInput(params)
  if(!parsed.ok)return reply({error:parsed.error},400)
  const org=(params.get('organizationId')??'').trim()
  if(org&&!validFoodUuid(org))return reply({error:'Invalid organization'},400)
  const rates:RateInput={
    sea:parseRate(params.get('seaRate'))??null,
    air:parseRate(params.get('airRate'))??null,
    road:parseRate(params.get('roadRate'))??null,
  }
  if(['seaRate','airRate','roadRate'].some(key=>
    parseRate(params.get(key))===undefined))
    return reply({error:'Freight rate must be a positive QAR/tonne value under 100000'},400)

  const supabase=await createClient()
  const {data:{user},error}=await supabase.auth.getUser()
  if(error||!user)return reply({error:'Sign in to compare transport corridors'},401)
  if(org){
    const gate=await requireCapability('supply.view',org)
    if(!gate.ok)return reply({error:gate.error},gate.status)
  }
  const evidence=await collectLogisticsEvidence(parsed.country)
  const screened=buildScreenedRoutes({
    ...parsed,rates,seaDistances:evidence.seaRoutes,
    lpi:evidence.lpi,lpiYear:evidence.lpiYear,
    waves:evidence.waves,weatherAgeHours:evidence.weatherAgeHours,
  })
  const spec=CARGO_SPECS[parsed.commodity]
  const hub=getExportHub(parsed.country)
  return reply({
    context:{
      commodity:parsed.commodity,country:parsed.country,
      countryName:countryName(parsed.country),
      tonnes:parsed.tonnes,deliveryDeadlineDays:parsed.limitDays,
      product:spec.label,
      productClass:spec.productClass,
      coldChain:spec.coldChain,handling:spec.temperature,
      importDestination:'Doha, Qatar',
    },
    referenceHubs:hub?{
      sea:{name:hub.port,code:hub.unlocode,coordinates:hub.sea},
      air:{name:hub.airport,code:hub.iata,coordinates:hub.air},
    }:null,
    routes:screened,
    sourceStatus:evidence.states,
    sources:evidence.refs,
    dataWarnings:evidence.messages,
    riskDisclaimer:'Heuristic screening score (0-100), not disruption probability or insurance risk.',
    pricesDisclaimer:'No shipping spot quotes returned. Costs appear only when a user supplies a freight quote in QAR per tonne.',
    scheduleDisclaimer:'No confirmed port call, airline booking, border service or verified real shipment tracking without carrier systems.',
    modelLimitations:LOGISTICS_DATA_RULES,
    generatedAt:new Date().toISOString(),
    bookingAvailable:false,
    countryVerifiedSupplier:false,
  })
}
