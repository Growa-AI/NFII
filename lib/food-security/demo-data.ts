import {
  addFoodDays,
  type FoodBalanceInput,
  type FoodFlowType,
} from './balance'

/** Explicitly synthetic, non-persisted demonstration data. Never use for live KPIs. */
export function buildDemoFoodBalanceInput(
  commodityId: string,
  fromDate: string,
  days: number,
): FoodBalanceInput {
  const examples: Record<string, [number, number, number, number, number]> = {
    // opening, production/day, confirmed imports/day, demand/day, loss/day
    tomato: [1200, 30, 10, 45, 1],
    cucumber: [700, 22, 7, 31, 1],
    milk: [850, 115, 4, 112, 2],
    rice: [4000, 0, 80, 85, 0.5],
    wheat: [5000, 0, 110, 120, 1],
    pepper: [500, 12, 4, 17, 0.5],
    lettuce: [350, 14, 3, 18, 0.5],
    date: [750, 5, 6, 11, 0.2],
    barley: [600, 1, 19, 21, 0.2],
  }
  const [opening, production, imports, demand, loss] = examples[commodityId] ?? [300, 5, 5, 10, 0.3]
  const end = addFoodDays(fromDate, days - 1)
  const stockDate = addFoodDays(fromDate, -1)
  const sourceRef = `synthetic-fixture:${commodityId}:v1`
  const flowTypes: Array<[FoodFlowType, number]> = [
    ['domestic_production', production],
    ['confirmed_import', imports],
    ['consumption', demand],
    ['loss', loss],
  ]
  return {
    commodityId,
    fromDate,
    toDate: end,
    sourceMode: 'demo',
    stocks: [{ id: 'demo-opening', asOfDate: stockDate, usableTonnes: opening, sourceRef, dataMode: 'demo' }],
    flows: flowTypes.map(([flowType, dailyTonnes]) => ({
      id: `demo-${flowType}`,
      externalKey: `demo-${commodityId}-${flowType}-${fromDate}`,
      flowType,
      effectiveDate: fromDate,
      quantityTonnes: Number((dailyTonnes * days).toFixed(3)),
      sourceRef,
      dataMode: 'demo',
    })),
    coverage: flowTypes.map(([flowType]) => ({
      id: `demo-coverage-${flowType}`,
      flowType,
      startDate: fromDate,
      endDate: end,
      status: 'complete',
      sourceRef,
      dataMode: 'demo',
    })),
  }
}
