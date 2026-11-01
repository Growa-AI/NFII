import {getExportHub,QATAR_AIR,QATAR_PORT,QATAR_ROAD,type GeoPoint} from './logistics-lanes'
import {splitAtDateline,type GeoLine,type GeoPointTuple} from './logistics-route-geometry'
import type {ScreenedRoute,RouteInputs} from './logistics-screening'

export type RouteMapOverlay={
  id:string;mode:ScreenedRoute['mode']
  paths:GeoLine
  fidelity:'provider_geometry'|'illustrative'
  from:string;to:string;via:string|null
  origin:GeoPointTuple;destination:GeoPointTuple
  source:string|null
}
const pt=(p:GeoPoint):GeoPointTuple=>[p.lat,p.lon]
const jebel:GeoPointTuple=[24.99,55.06]
const salalah:GeoPointTuple=[16.94,54.01]
const dubai:GeoPointTuple=[25.25,55.36]
/** Links missing source geometry are explicitly illustrative, not navigable tracks. */
export function makeRouteMapOverlays(
  routes:readonly ScreenedRoute[],country:string,
  observed:RouteInputs['seaDistances'],
):RouteMapOverlay[]{
  const hub=getExportHub(country)
  if(!hub)return []
  return routes.map((route):RouteMapOverlay=>{
    const origin=route.mode==='air'?pt(hub.air):pt(hub.sea)
    const destination=route.mode==='air'?pt(QATAR_AIR):
      route.mode==='road'?pt(QATAR_ROAD):pt(QATAR_PORT)
    const via=route.id==='sea_jebel_ali'?jebel:
      route.id==='sea_salalah'?salalah:route.id==='air_dubai'?dubai:null
    const published=route.mode==='sea'?observed?.[route.id]?.geometry:null
    const paths=published?.length?splitAtDateline(published):[]
    return {
      id:route.id,mode:route.mode,
      paths,
      fidelity:published?.length?'provider_geometry':'illustrative',
      from:route.from,to:route.to,via:route.via,
      origin,destination,
      source:published?.length?'SeaRoutes':null,
    }
  })
}

/**
 * Initial UI illustration while the user has not run a provider-backed
 * assessment. These lines NEVER imply a bookable maritime/air service.
 */
export function previewRouteMapOverlays(country:string):RouteMapOverlay[]{
  const hub=getExportHub(country)
  if(!hub)return []
  const seaOrigin=pt(hub.sea),airOrigin=pt(hub.air)
  const rows:Array<{id:string;mode:ScreenedRoute['mode'];
    origin:GeoPointTuple;end:GeoPointTuple;via:GeoPointTuple|null}>= [
    {id:'sea_direct',mode:'sea',origin:seaOrigin,end:pt(QATAR_PORT),via:null},
    {id:'air_direct',mode:'air',origin:airOrigin,end:pt(QATAR_AIR),via:null},
  ]
  if(!['SA','AE','OM','KW','BH','QA'].includes(country)){
    rows.push(
      {id:'sea_jebel_ali',mode:'sea',origin:seaOrigin,end:pt(QATAR_PORT),via:jebel},
      {id:'sea_salalah',mode:'sea',origin:seaOrigin,end:pt(QATAR_PORT),via:salalah},
    )
  }
  if(country!=='AE')rows.push(
    {id:'air_dubai',mode:'air',origin:airOrigin,end:pt(QATAR_AIR),via:dubai},
  )
  if(hub.roadEligible)rows.push({
    id:'road_candidate',mode:'road',origin:seaOrigin,end:pt(QATAR_ROAD),via:null,
  })
  return rows.map(row=>({
    id:row.id,mode:row.mode,origin:row.origin,destination:row.end,
    from:row.mode==='air'?hub.airport:hub.port,
    to:row.mode==='air'?QATAR_AIR.name:
      row.mode==='road'?QATAR_ROAD.name:QATAR_PORT.name,
    paths:[],
    via:row.via?'Candidate transfer hub':null,
    fidelity:'illustrative' as const,source:null,
  }))
}
