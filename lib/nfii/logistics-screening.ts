/**
 * NFII screening of POSSIBLE food transport corridors into Qatar.
 * Never infer commercial service, schedules, customs feasibility or bookings
 * from coordinates alone. Geometry-only air/road figures and transit times
 * are explicitly modelled planning assumptions, not carrier observations.
 */
import {CARGO_SPECS,getExportHub,haversineKm,QATAR_AIR,QATAR_PORT,QATAR_ROAD,type GeoPoint} from './logistics-lanes'

export type Mode='sea'|'air'|'road'
export type CorridorEvidence='carrier_route_geometry'|'geographic_proxy'
export type RateInput={sea:number|null;air:number|null;road:number|null}
export type RouteInputs={commodity:string;country:string;tonnes:number;limitDays:number;rates:RateInput;
  seaDistances:Record<string,{km:number;durationDays:number|null;routeUrl:string}>|null;
  lpi:number|null;lpiYear:number|null;waves:number|null;weatherAgeHours:number|null}
export type ScreenedRoute={
  id:string;country:string;commodity:string;mode:Mode;via:string|null;
  from:string;to:string;originCode:string;destinationCode:string;
  distanceKm:number;distanceType:'observed_sea_route'|'straight_line_lower_bound'|'geometric_estimate';
  estimatedDays:number|null;timeBasis:string;feasibleBeforeDeadline:boolean|null;
  reeferRequired:boolean;storageNote:string;
  rateQarPerTonne:number|null;freightTotalQar:number|null;freightQarKg:number|null;
  costSource:'user_supplied_rate'|'no_rate';riskScore:number;
  riskBand:'lower'|'elevated'|'high';riskDrivers:string[];
  riskMethod:string;quality:'route_api'|'model_only';
  evidence:CorridorEvidence;sourceUrl:string|null;
  requiresQuote:true;bookingConfirmed:false;
}
const round=(n:number,decimal=1)=>Number(n.toFixed(decimal))
export const QATAR_GATEWAYS={
  sea:QATAR_PORT,air:QATAR_AIR,road:QATAR_ROAD,
}
const km=(a:GeoPoint,b:GeoPoint)=>haversineKm(a,b)
const MAX=100000
/** Forward-looking feasibility cannot be asserted when departure is not scheduled. */
export function buildScreenedRoutes(inputs:RouteInputs):ScreenedRoute[]{
  const hub=getExportHub(inputs.country)
  const spec=CARGO_SPECS[inputs.commodity]
  if(!hub||!spec)throw Error('Unsupported origin or food type')
  const origin=hub.country,tonnes=inputs.tonnes
  if(!Number.isFinite(tonnes)||tonnes<=0||tonnes>200)throw Error('Invalid tonnes')
  const make=(route:{
    id:string;mode:Mode;via:string|null;from:string;to:string;
    originCode:string;destinationCode:string;geometry:GeoPoint[];
  }):ScreenedRoute=>{
    const observed=inputs.seaDistances?.[route.id]
    const routeKm=observed?.km
    const rawKm=route.geometry.reduce((sum,p,i)=>
      i?sum+km(route.geometry[i-1],p):0,0)
    // Sea fallback: do not dress a direct geodesic as a navigable sea route.
    const distance=route.mode==='sea'&&routeKm!==undefined?routeKm:
      route.mode==='road'?rawKm*1.4:rawKm
    const documentedDistance=route.mode==='sea'&&routeKm!==undefined
    // Single air and road paths are only coarse screening scenarios.
    const days=route.mode==='sea'?
      (observed?.durationDays??null):
      route.mode==='air'?round(distance/750/24+2.5+(route.via?1:0),1):
      round(distance/550+1.4,1)
    const rate=inputs.rates[route.mode]
    const safeRate=rate!==null&&Number.isFinite(rate)&&rate>0&&rate<MAX?rate:null
    const riskDrivers:string[]=[]
    let score=20
    if(!documentedDistance&&route.mode==='sea'){
      score+=20;riskDrivers.push('Sea distance/time unavailable without routing provider')
    }
    if(!route.via&&route.mode==='air'){
      score+=8;riskDrivers.push('No verified flight schedule or flight capacity')
    }
    if(route.via){
      score+=12;riskDrivers.push('Unverified connection or transshipment and handling')
    }
    if(route.mode==='road'){
      score+=14;riskDrivers.push('Road distance is geometric; no verified border clearance/route')
    }
    if(spec.coldChain){
      score+=12;riskDrivers.push('Requires documented temperature and shelf-life handling')
    }
    if(days===null){
      score+=12;riskDrivers.push('Transit duration missing, deadline cannot be assessed')
    }else if(days>inputs.limitDays){
      score+=25;riskDrivers.push('Planning estimate exceeds delivery deadline')
    }else if(days>inputs.limitDays*.8){
      score+=12;riskDrivers.push('Limited margin to delivery deadline')
    }
    if(inputs.lpi!==null){
      score+=round((5-inputs.lpi)*6,1)
      riskDrivers.push('World Bank LPI country benchmark '+inputs.lpi+
        ' ('+inputs.lpiYear+'); dated national score, NOT lane risk')
    }else {
      score+=8;riskDrivers.push('Origin country LPI not available')
    }
    if(route.mode==='sea'){
      if(inputs.waves!==null&&Number.isFinite(inputs.waves)){
        if(inputs.waves>=3){
          score+=15;riskDrivers.push('Elevated waves at sampled port grid; route-wide conditions unknown')
        }
      }else{
        score+=5;riskDrivers.push('Live marine wave sample unavailable')
      }
    }
    if(safeRate===null){
      score+=6;riskDrivers.push('No carrier freight quote supplied; real landed cost unknown')
    }
    const bounded=Math.min(100,Math.max(0,round(score,0)))
    return {
      id:route.id,country:origin,commodity:inputs.commodity,mode:route.mode,
      via:route.via,from:route.from,to:route.to,
      originCode:route.originCode,destinationCode:route.destinationCode,
      distanceKm:round(distance,0),
      distanceType:documentedDistance?'observed_sea_route':
        route.mode==='road'?'geometric_estimate':'straight_line_lower_bound',
      estimatedDays:days,
      timeBasis:documentedDistance?
        (observed!.durationDays!==null?'SeaRoutes published route duration':'No published schedule/duration'):
        route.mode==='sea'?'No sea transit ETA; straight-line lower-bound only':
        'Planning estimate from geometric distance, nominal movement and handling; no schedules',
      feasibleBeforeDeadline:days!==null?days<=inputs.limitDays:null,
      reeferRequired:spec.coldChain,storageNote:spec.temperature,
      rateQarPerTonne:safeRate,
      freightTotalQar:safeRate===null?null:round(safeRate*tonnes,2),
      freightQarKg:safeRate===null?null:round(safeRate/1000,3),
      costSource:safeRate===null?'no_rate':'user_supplied_rate',
      riskScore:bounded,riskBand:bounded>=67?'high':bounded>=40?'elevated':'lower',
      riskDrivers,riskMethod:'Transparent screening heuristic, not actuarial forecast',
      quality:documentedDistance?'route_api':'model_only',
      evidence:documentedDistance?'carrier_route_geometry':'geographic_proxy',
      sourceUrl:documentedDistance?observed!.routeUrl:null,
      requiresQuote:true,bookingConfirmed:false,
    }
  }
  const originSea=hub.sea,originAir=hub.air
  const wayJebel={lat:24.99,lon:55.06},waySalalah={lat:16.94,lon:54.01}
  const directSea=make({id:'sea_direct',mode:'sea',via:null,from:hub.port,to:QATAR_PORT.name,
    originCode:hub.unlocode,destinationCode:QATAR_PORT.code,
    geometry:[originSea,QATAR_PORT]})
  const variants:ScreenedRoute[]=[directSea]
  if(!['SA','AE','OM','KW','BH','QA'].includes(origin)){
    variants.push(make({id:'sea_jebel_ali',mode:'sea',via:'Jebel Ali transfer candidate',
      from:hub.port,to:QATAR_PORT.name,originCode:hub.unlocode,
      destinationCode:QATAR_PORT.code,
      geometry:[originSea,wayJebel,QATAR_PORT]}))
    variants.push(make({id:'sea_salalah',mode:'sea',via:'Salalah transfer candidate',
      from:hub.port,to:QATAR_PORT.name,originCode:hub.unlocode,
      destinationCode:QATAR_PORT.code,geometry:[originSea,waySalalah,QATAR_PORT]}))
  }
  variants.push(make({id:'air_direct',mode:'air',via:null,from:hub.airport,
    to:QATAR_AIR.name,originCode:hub.iata,destinationCode:QATAR_AIR.code,
    geometry:[originAir,QATAR_AIR]}))
  if(origin!=='AE'){
    variants.push(make({id:'air_dubai',mode:'air',via:'Dubai connection candidate',
      from:hub.airport,to:QATAR_AIR.name,originCode:hub.iata,
      destinationCode:QATAR_AIR.code,
      geometry:[originAir,{lat:25.25,lon:55.36},QATAR_AIR]}))
  }
  if(hub.roadEligible){
    variants.push(make({id:'road_candidate',mode:'road',via:'Border crossing unverified',
      from:hub.port,to:'Abu Samra / Doha',originCode:origin,
      destinationCode:QATAR_ROAD.code,
      geometry:[originSea,QATAR_ROAD]}))
  }
  return variants.sort((a,b)=>
    (a.feasibleBeforeDeadline===false?1:0)-(b.feasibleBeforeDeadline===false?1:0)||
    a.riskScore-b.riskScore)
}
export const LOGISTICS_DATA_RULES=[
  'No live carrier schedules or bookable routings without carrier API.',
  'Straight-line routes are lower bounds, not navigable maritime paths.',
  'Cost values only from user-provided freight rate per tonne; do not imply spot quotes.',
  'LPI is a historical national benchmark, not a current shipment risk probability.',
  'Wave height is sampled at the departure port; not entire-route storm intelligence.',
  'Shelf-life constraints depend on harvest date, loading temperature and SKU.',
] as const
