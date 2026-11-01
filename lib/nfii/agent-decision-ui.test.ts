import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe,expect,it} from 'vitest'

const read=(file:string)=>readFileSync(join(process.cwd(),file),'utf8')
const lab=read('components/dashboard/commodity-agent-lab.tsx')
const verdict=read('components/dashboard/commodity-agent-verdict.tsx')
const logic=read('lib/nfii/agent-decision.ts')

describe('Final decision discoverability and safety',()=>{
  it('shows the executive verdict before the long agent activity log without requiring playback',()=>{
    expect(lab).toContain('<CommodityAgentVerdict')
    expect(lab).toContain('buildAgentFinalRecommendation(result)')
    expect(lab.indexOf('<CommodityAgentVerdict')).toBeLessThan(lab.indexOf("tx('Agent activity log'"))
    expect(lab).not.toContain('revealed >= result.steps.length && <CommodityAgentVerdict')
    expect(verdict).toContain('FINAL AGENT RECOMMENDATION')
    expect(verdict).toContain('Next recommended step')
    expect(verdict).toContain('Responsible reviewer')
  })

  it('makes proposed quantity, alternatives and human approval state distinguishable',()=>{
    expect(verdict).toContain('Not an approved purchase quantity')
    expect(verdict).toContain('Options to verify before acting')
    expect(verdict).toContain('Potential gap to investigate')
    expect(verdict).toContain('Approval and execution status')
    expect(verdict).toContain('Purchase orders created: 0 · Reserves released: 0')
    expect(verdict).toContain('Local approval rehearsed. No actual authorization.')
    expect(verdict).toContain('Illustrative Qatar inputs')
  })

  it('never issues any request that mutates server or Supabase state',()=>{
    expect(verdict).not.toMatch(/fetch\s*\(/)
    expect(verdict).not.toContain('createAdminClient')
    expect(logic).not.toMatch(/fetch\s*\(/)
    expect(logic).not.toContain('createAdminClient')
    expect(logic).toContain("executionStatus: 'not_executed'")
    expect(logic).toContain('requiredHumanApproval: true')
  })
})
