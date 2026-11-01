# NFII 2.0: Commodity Intelligence and agent operations rehearsal

## Purpose and user problem

The former Commodity Intelligence page mixed commodity-level food balance with legacy
national Watchtower coverage and generic agricultural/IoT summaries. It also
embedded a generic AI analysis which did not explain how specialist agents would
actually collaborate across Procurement, Logistics and Strategic Reserves.

The new information architecture is **one commodity, one time horizon and one
evidence source at a time**, with an explicit distinction between observed
organization records and illustrative Qatar 2026 source assumptions.

## Commodity Intelligence

At \`/dashboard?module=commodities&commodityId=rice\`:

1. Select **commodity** (nine catalogued commodities) and **7/30/90/180-day**
   horizon.
2. Pick **Auto / Live data / Example data**. Auto prefers a *complete*
   independently reviewed balance for the active authorized organization;
   otherwise it shows a clearly tagged illustrative view. Live mode never
   fills missing evidence with simulated quantities.
3. Read four executive indicators: expected end-of-period usable stock,
   period consumption, days of coverage at period end, and deficit. Units
   and interpretation are explained.
4. Inspect the explicit stock arithmetic:
   **opening stock + local production + imports - consumption - loss = net**.
   Negative net produces a deficit; physical usable stock is floored at zero.
5. Review **commodity-specific** linked procurement contracts, approved POs,
   shipment status, usable reserve lots and approved-but-unexecuted release
   commitments. Physical inventory, administrative shipments and contracts
   are **not** added again to the source food balance.
6. Open the **Agent operations simulation** tab or the **Evidence & source
   records** tab. Live source intake and independent review remain available
   there, with the existing permissions and APIs. No new migration is required.

Removed from this page: generic national contract totals, unrelated
Watchtower signals/coverage, unscoped national climate risk, and unrelated
farm-level production/water/energy KPI tiles.

## Qatar examples reused, not reseeded

The **existing** \`supabase/seeds/qatar-2026-sandbox/03_dataset_preview.json\`
is the sole illustrative operational source. \`lib/food-security/demo-data.ts\`
now additionally builds a matching illustrative food balance from the
**same** \`commodity_daily_assumptions_tonnes\` records. For flexible horizon
selection, it expands the assumptions into dated daily flows; it retains
documented Qatar vegetable seasonality from the existing SQL example.

These are read-only objects in the application; **no SQL scripts, organization,
users, records, approvals or migrations are created**. The previous demo
generator remains unchanged for other consumers.

## Operational multi-agent simulator

Visible in **Commodity Intelligence > Agent operations simulation**, and
**Watchtower > Agent operations** (\`#watchtower-agents\`).

The step-by-step browser simulator reuses the existing
\`AGENT_REGISTRY\` specialist identities:

1. **Orchestrator** assigns the commodity scope and horizon.
2. **Data Quality Agent** checks opening stock, all four flow categories and source references.
3. **Food Security Analyst** calculates food supply, demand, projected stock and deficit.
4. **Agronomy Analyst** assesses local-production contribution and explicitly
   reports that farm/satellite source evidence is *not* integrated into this case.
5. **Supply Analyst / Procurement** checks related suppliers, approved contracts and orders.
6. **Supply Analyst / Logistics** reviews linked shipments, planned movements and delay flags.
7. **Compliance Analyst / Reserves** reviews expiry-aware, approved lot inventory
   and approved-but-unexecuted release commitments, without double counting.
8. **Weather Analyst** identifies missing linked weather evidence instead of inventing a forecast.
9. **Watchtower Analyst** runs deterministic stress testing and uses provisional
   7/14/30-day coverage risk bands. (These are **not** official Qatar policy.)
10. **Reporting Agent** drafts a decision brief, followed by a mandatory
    **Human authorization gate**.

The UI shows the existing and proposed data flows with a run/expand action and
a ten-stage activity log. Each stage exposes the agent role, finding, evidence
and attention/blocked state. Available presets are baseline, import disruption,
local-production loss, and compound crisis; four stress sliders can be edited
independently. Numerical shock calculations use the already shipped
\`calculateFoodScenario()\`.

### Human-in-the-loop boundary

All proposals and locally rehearsed approve/reject buttons are **browser-only
simulation**. They do not call the model/LLM, \`/api/ai/missions\`,
\`/api/nfii/operations\`, Supabase privileged RPCs, carrier systems or
external procurement. They do **not** create real contracts, shipments,
evidence approvals, government decisions or reserve releases.

The read-only program demonstrates the *intended operating model* of specialist
agents rather than claiming an actual autonomous multi-agent run. Real tool
execution, policy approvals, missions, audit persistence and external source
integration remain independent future engineering work.

## Validation and safety

- Switching organizations clears stale live API reads and enforces the
  \`organizationId\` returned from authenticated endpoints.
- Auto mode never merges illustrative food balances with real operational
  rows. Real missing information is not interpreted as zero.
- A missing/partial live balance gives **unknown**, not a healthy screening
  score or fabricated shortage.
- Preview row IDs and sourceRefs retain explicit synthetic/test provenance.
- The two example sources are designed for a fictional Qatar food distributor,
  **not certified national reserves, Qatar-wide consumption or import volumes**.
- Programmatic unit tests cover cross-module links, expired lots,
  reservations, realistic 7/30/90/180-day illustrative food calculations,
  deficit risk under combined shocks, incomplete evidence, approval gating
  and the new information architecture.
- GitHub CI validates ESLint, Vitest, TypeScript and Next.js build.
- Real-browser visual and Supabase-backed staging acceptance tests remain
  necessary before a production rollout.
