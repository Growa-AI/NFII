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
  return routes.map(route=>{
    const origin=route.mode==='air'?pt(hub.air):pt(hub.sea)
    const destination=route.mode==='air'?pt(QATAR_AIR):
      route.mode==='road'?pt(QATAR_ROAD):pt(QATAR_PORT)
    const via=route.id==='sea_jebel_ali'?jebel:
      route.id==='sea_salalah'?salalah:route.id==='air_dubai'?dubai:null
    const published=route.mode==='sea'&&observed?.[route.id]?.geometry
    const paths=published?.length?splitAtDateline(published):
      splitAtDateline([[origin,...(via?[via]:[]),destination]])
    return {
      id:route.id,mode:route.mode,
      paths,
      fidelity:published?.length?'provider_geometry':'illustrative',
      from:route.from,to:route.to,via:route.via,
      origin,destination,
      source:published?.length?'SeaRoutes':null,
    }
  }).filter(item=>item.paths.length>0)
}
