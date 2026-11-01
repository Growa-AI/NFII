import {describe,expect,it} from 'vitest'
import {readSeaRouteGeometry,splitAtDateline} from './logistics-route-geometry'
import {makeRouteMapOverlays,previewRouteMapOverlays} from './logistics-route-map'
import {buildScreenedRoutes} from './logistics-screening'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

const api=readFileSync(join(process.cwd(),'app/api/nfii/logistics/corridors/route.ts'),'utf8')
const ui=readFileSync(join(process.cwd(),'components/dashboard/nfii-ops/logistics-corridor-intelligence.tsx'),'utf8')
const map=readFileSync(join(process.cwd(),'components/dashboard/nfii-ops/logistics-route-map.tsx'),'utf8')
describe('Interactive food import routes on a real map',()=>{
  it('sanitizes GeoJSON [longitude,latitude] and limits payload size',()=>{
    const coords={type:'FeatureCollection',features:[{geometry:{
      type:'LineString',coordinates:[[72.95,18.95],[66.98,24.82],[51.61,25]],
    }}]}
    const lines=readSeaRouteGeometry(coords)
    expect(lines).toEqual([[[18.95,72.95],[24.82,66.98],[25,51.61]]])
    expect(readSeaRouteGeometry({features:[{geometry:{type:'LineString',
      coordinates:[[300,25],[66,24]]}}]})).toBeNull()
    expect(readSeaRouteGeometry({features:[{geometry:{type:'Point',
      coordinates:[51,25]}}]})).toBeNull()
    expect(readSeaRouteGeometry({features:[{geometry:{type:'MultiLineString',
      coordinates:[[[51,25],[52,26]],[[53,27],[54,28]]]}}]})).toHaveLength(2)
    const many=Array.from({length:4000},(_,i)=>[50+i/4000,20+i/4000])
    expect(readSeaRouteGeometry({features:[{geometry:{
      type:'LineString',coordinates:many,
    }}]})?.[0].length).toBeLessThanOrEqual(160)
  })
  it('splits lines that cross the international dateline',()=>{
    expect(splitAtDateline([[[12,177],[13,179],[13,-179],[14,-175]]]))
      .toEqual([[[12,177],[13,179]],[[13,-179],[14,-175]]])
  })
  it('draws API-provided sea paths as sourced and other routes as illustrative',()=>{
    const screened=buildScreenedRoutes({
      commodity:'rice',country:'IN',tonnes:20,limitDays:60,
      rates:{sea:null,air:null,road:null},
      lpi:null,lpiYear:null,waves:null,weatherAgeHours:null,
      seaDistances:{sea_direct:{
        km:3000,durationDays:8,routeUrl:'https://developer.searoutes.com/reference/getsearoute',
        geometry:[[[18.95,72.95],[25,51.61]]],
      }},
    })
    const routed=makeRouteMapOverlays(screened,'IN',{
      sea_direct:{km:3000,durationDays:8,
        routeUrl:'https://developer.searoutes.com/reference/getsearoute',
        geometry:[[[18.95,72.95],[25,51.61]]]},
    })
    expect(routed.find(x=>x.id==='sea_direct')?.fidelity).toBe('provider_geometry')
    expect(routed.find(x=>x.id==='air_direct')?.fidelity).toBe('illustrative')
    expect(routed.some(x=>x.id==='sea_salalah')).toBe(false)
    expect(routed.find(x=>x.id==='sea_direct')?.paths[0][0]).toEqual([18.95,72.95])
    expect(routed.every(x=>x.destination[0]>24)).toBe(true)
  })
  it('shows unverified map preview before an API assessment',()=>{
    const preliminary=previewRouteMapOverlays('IN')
    expect(preliminary.some(x=>x.id==='sea_direct')).toBe(true)
    expect(preliminary.some(x=>x.id==='air_direct')).toBe(true)
    expect(preliminary.every(x=>x.fidelity==='illustrative'&&x.paths.length===0)).toBe(true)
    expect(previewRouteMapOverlays('XX')).toEqual([])
  })
  it('wires map selection to details while preserving source distinctions',()=>{
    expect(api).toContain('mapRoutes:makeRouteMapOverlays')
    expect(ui).toContain('<LogisticsRouteMap')
    expect(ui).toContain('previewRouteMapOverlays(country)')
    expect(ui).toContain('onSelect={id=>data?setSelected(id):setPreviewSelected(id)}')
    expect(map).toContain("void import('leaflet')")
    expect(map).toContain('fitBounds')
    expect(map).toContain('route.paths.length')
    expect(map).toContain("line.on('click'")
    expect(map).toContain('OpenStreetMap contributors')
  })
})
