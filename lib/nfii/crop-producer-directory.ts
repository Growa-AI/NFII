/**
 * Crop-to-organization evidence from FairTSA's PUBLIC product directory.
 * Names, product labels, country, certifier and producer ID are transcribed
 * from https://www.fairtsa.org/products (consulted 2026-11-01).
 *
 * IMPORTANT: FairTSA lists scheme participants, which can include a farm,
 * farm group, processor, handler or trader. A certified PRODUCT entry does
 * not prove the named entity grows the crop, holds a current certificate,
 * has export licences, available tonnage or can deliver to Qatar.
 *
 * This is an intentionally LIMITED, attributed registry excerpt, not a
 * complete worldwide search, an official FairTSA API or live verification.
 * No invented producers; no inference from company names or national trade.
 */

import {resolveCommodity} from '@/lib/platform/commodity-catalog'

export const FAIRTSA_REGISTRY_URL='https://www.fairtsa.org/products'
export const USDA_ORGANIC_REGISTRY_URL='https://organic.ams.usda.gov/integrity/'
export const GLOBALGAP_REGISTRY_URL='https://globalgap.org/what-we-offer/globalgap-it-platform/'
export const FAIRTSA_EXCERPT_CHECKED='2026-11-01'

export interface CropProducerEvidence {
  recordId:string
  organizationName:string
  countryCode:string
  countryName:string
  certifier:string
  listedProducts:readonly string[]
  matchedProduct:string
  commodityId:string
  sourceName:'FairTSA public certified-products listing'
  sourceUrl:typeof FAIRTSA_REGISTRY_URL
  registryCheckedOn:typeof FAIRTSA_EXCERPT_CHECKED
  evidenceType:'product_listed_in_certification_directory'
  cropGrowerConfirmed:false
  currentCertificateConfirmed:false
  exportCapabilityConfirmed:false
  capacityTonnes:null
  supplierApproved:false
}

/**
 * Explicit inclusion is safer than string contains: "pepper" on a spice
 * directory is not proof of Capsicum/bell-pepper production. Rice paddy is
 * listed under the rice commodity with its precise raw product label.
 */
const DIRECTORY:readonly {
  id:string
  name:string
  country:string
  countryName:string
  certifier:string
  cropProducts:Partial<Record<'tomato'|'barley'|'rice'|'wheat'|'milk',string>>
}[]=[
  {id:'EP117',name:'Ban Um-Sang Rice Community Enterprise',
    country:'TH',countryName:'Thailand',certifier:'FLO-Cert',
    cropProducts:{rice:'Rice'}},
  {id:'EP116',name:'NamOm Community Enterprise Group',
    country:'TH',countryName:'Thailand',certifier:'FLO-Cert',
    cropProducts:{rice:'Rice'}},
  {id:'EP103',name:'FoodTech Solutions Co. Ltd',
    country:'TH',countryName:'Thailand',certifier:'FLO-Cert',
    cropProducts:{rice:'Rice'}},
  {id:'EP102',name:'PraTithi Organic Foods Private Limited',
    country:'IN',countryName:'India',certifier:'FLO-Cert',
    cropProducts:{rice:'Rice'}},
  {id:'PR 0151',name:'Kadwara Ecopure Javik Samuha',
    country:'IN',countryName:'India',certifier:'Bioagricert',
    cropProducts:{rice:'Non Basmati Rice Paddy',barley:'Barley',wheat:'Wheat'}},
  {id:'PR 0152',name:'Otapurwa Ecopure Javik Samuha',
    country:'IN',countryName:'India',certifier:'Bioagricert',
    cropProducts:{rice:'Non Basmati Rice Paddy',barley:'Barley',wheat:'Wheat'}},
  {id:'P00150',name:'Isik Tarim',
    country:'TR',countryName:'Türkiye',certifier:'Kiwa BCS',
    cropProducts:{barley:'Barley'}},
  {id:'P00147',name:'Fade Food',
    country:'TR',countryName:'Türkiye',certifier:'Bio Inspekta Turkiye',
    // Directory also lists dried/sun-dried tomato. Not proof of growing fresh tomato.
    cropProducts:{tomato:'Tomato (also lists dried/sun-dried tomato)'}},
  {id:'L00168',name:'Akshayakalpa Farms and Foods Pvt. Ltd.',
    country:'IN',countryName:'India',certifier:'Aditi',
    // Dairy handler/producer role and milk origin need independent checking.
    cropProducts:{milk:'Milk (also lists dairy, cheese and ghee)'}},
] as const

export function cropProducerCoverage():Record<string,number>{
  const result:Record<string,number>={}
  for(const commodity of ['tomato','cucumber','pepper','lettuce','date','barley','milk','rice','wheat'])
    result[commodity]=DIRECTORY.filter(x=>Boolean(x.cropProducts[commodity as keyof typeof x.cropProducts])).length
  return result
}

export function findDocumentedCropOrganizations(
  commodity:string,country:string='',
):CropProducerEvidence[]{
  const crop=resolveCommodity(commodity)
  if(!crop)return []
  const allowedCountry=country.trim().toUpperCase()
  if(allowedCountry&&!/^[A-Z]{2}$/.test(allowedCountry))return []
  return DIRECTORY.flatMap(row=>{
    if(allowedCountry&&row.country!==allowedCountry)return []
    const matched=row.cropProducts[crop.id as keyof typeof row.cropProducts]
    if(!matched)return []
    return [{
      recordId:row.id,
      organizationName:row.name,
      countryCode:row.country,
      countryName:row.countryName,
      certifier:row.certifier,
      listedProducts:[matched],
      matchedProduct:matched,
      commodityId:crop.id,
      sourceName:'FairTSA public certified-products listing' as const,
      sourceUrl:FAIRTSA_REGISTRY_URL,
      registryCheckedOn:FAIRTSA_EXCERPT_CHECKED,
      evidenceType:'product_listed_in_certification_directory' as const,
      cropGrowerConfirmed:false as const,
      currentCertificateConfirmed:false as const,
      exportCapabilityConfirmed:false as const,
      capacityTonnes:null,
      supplierApproved:false as const,
    }]
  })
}

export function validateCropProducerSearch(params:URLSearchParams):
  |{ok:true;commodity:string;country:string}
  |{ok:false;error:string}{
  const input=params.get('commodity')??''
  const commodity=resolveCommodity(input)
  if(!commodity||input!==commodity.id)
    return {ok:false,error:'Choose a supported crop or food product from the catalogue'}
  const country=(params.get('country')??'').trim().toUpperCase()
  if(country&&!/^[A-Z]{2}$/.test(country))
    return {ok:false,error:'Country must be an ISO two-letter code'}
  return {ok:true,commodity:commodity.id,country}
}
