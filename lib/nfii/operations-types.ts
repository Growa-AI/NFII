export type OperationsArea='procurement'|'logistics'|'reserves'
export type RecordStatus='pending'|'approved'|'rejected'|'planned'|'in_transit'|
  'delayed'|'delivered'|'cancelled'|'executed'

export interface OperationsRow {
  id: string
  organization_id: string
  status?: RecordStatus
  created_at?: string
  created_by?: string
  code?: string
  name?: string
  supplier_id?: string
  contract_id?: string
  purchase_order_id?: string
  shipment_id?: string
  warehouse_id?: string
  lot_id?: string
  target_type?: string
  target_id?: string
  submitted_by?: string
  reviewed_by?: string
  action?: string
  event_type?: string
  entity_type?: string
  review_note?: string
  country_code?: string
  commodity_code?: string
  contract_ref?: string
  order_ref?: string
  shipment_ref?: string
  lot_ref?: string
  release_ref?: string
  contracted_tonnes?: string | number
  ordered_tonnes?: string | number
  shipment_tonnes?: string | number
  received_tonnes?: string | number
  released_tonnes?: string | number
  quantity_tonnes?: string | number
  price_qar_per_tonne?: string | number
  valid_from?: string
  valid_to?: string
  eta_date?: string
  expiry_date?: string
  origin?: string
  destination?: string
  location?: string
  purpose?: string
  details?: Record<string,unknown>
}

export interface OperationsSnapshot {
  suppliers:OperationsRow[]
  contracts:OperationsRow[]
  purchaseOrders:OperationsRow[]
  shipments:OperationsRow[]
  warehouses:OperationsRow[]
  lots:OperationsRow[]
  releases:OperationsRow[]
  approvals:OperationsRow[]
  events:OperationsRow[]
}

export interface OperationsResponse {
  organizationId:string
  scope:'organization'
  dataSource:'database'
  generatedAt:string
  snapshot:OperationsSnapshot
  limits:{maxPerTable:number;truncated:string[]}
  note:string
}

export const EMPTY_OPERATIONS:OperationsSnapshot={
  suppliers:[],contracts:[],purchaseOrders:[],shipments:[],
  warehouses:[],lots:[],releases:[],approvals:[],events:[],
}

export function operationalVolume(value:unknown):number{
  const n=Number(value)
  return Number.isFinite(n)&&n>=0?n:0
}

/** Physical reserve inventory is separate from the reviewed food balance. */
export function reservePosition(snapshot:OperationsSnapshot,asOfDate:string){
  const usableLots=snapshot.lots.filter(row=>
    row.status==='approved' && Boolean(row.expiry_date) &&
    String(row.expiry_date)>=asOfDate
  )
  const physical=usableLots.reduce((sum,row)=>
    sum+Math.max(0,operationalVolume(row.received_tonnes)-
      operationalVolume(row.released_tonnes)),0)
  const reserved=snapshot.releases
    .filter(row=>row.status==='approved' &&
      usableLots.some(lot=>lot.id===row.lot_id))
    .reduce((sum,row)=>sum+operationalVolume(row.quantity_tonnes),0)
  return {
    availablePhysicalTonnes:Math.round(physical*1000)/1000,
    approvedReservedTonnes:Math.round(reserved*1000)/1000,
    uncommittedTonnes:Math.round(Math.max(0,physical-reserved)*1000)/1000,
    usableLotCount:usableLots.length,
  }
}
