/** Sanitized GeoJSON linework for NFII logistics. Coordinates are [lat, lon] for Leaflet. */
export type GeoPointTuple=readonly [latitude:number,longitude:number]
export type GeoLine=GeoPointTuple[][]
type Obj=Record<string,unknown>
const object=(x:unknown):Obj=>x&&typeof x==='object'&&!Array.isArray(x)?x as Obj:{}
const good=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const point=(c:unknown):GeoPointTuple|null=>{
  if(!Array.isArray(c)||c.length<2||!good(c[0])||!good(c[1]))return null
  const [lon,lat]=c as [number,number]
  if(Math.abs(lat)>90||Math.abs(lon)>180)return null
  return [lat,lon]
}
const clean=(input:unknown,limit=160):GeoPointTuple[]=>{
  if(!Array.isArray(input))return []
  const parsed=input.slice(0,24000).map(point).filter((p):p is GeoPointTuple=>p!==null)
  if(parsed.length<2)return []
  const step=Math.max(1,Math.ceil((parsed.length-1)/(limit-1)))
  const sampled=parsed.filter((_,i)=>i%step===0)
  if(sampled[sampled.length-1]!==parsed[parsed.length-1])
    sampled.push(parsed[parsed.length-1])
  return sampled.slice(0,limit)
}
/** SeaRoutes GeoJSON FeatureCollection; rejects partial or absurd geometries. */
export function readSeaRouteGeometry(raw:unknown):GeoLine|null{
  const doc=object(raw),features=doc.features
  const rawGeometry=Array.isArray(features)?object(object(features[0]).geometry):object(doc.geometry)
  const typ=rawGeometry.type
  const coordinates=rawGeometry.coordinates
  if(!Array.isArray(coordinates))return null
  const lines=typ==='LineString'?[coordinates]:
    typ==='MultiLineString'?coordinates.slice(0,24):[]
  const output=lines.map(line=>clean(line)).filter(line=>line.length>=2)
  if(!output.length||output.reduce((sum,line)=>sum+line.length,0)>2000)return null
  return output
}
/** Consecutive segments spanning the dateline are split to prevent world wraps. */
export function splitAtDateline(lines:GeoLine):GeoLine{
  const result:GeoLine=[]
  for(const line of lines){
    let segment:GeoPointTuple[]=[]
    for(const p of line){
      if(segment.length&&Math.abs(p[1]-segment[segment.length-1][1])>180){
        if(segment.length>=2)result.push(segment)
        segment=[]
      }
      segment.push(p)
    }
    if(segment.length>=2)result.push(segment)
  }
  return result
}
