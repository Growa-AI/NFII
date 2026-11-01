# NFII Logistics Intelligence: multimodal food corridor screening

Implemented on **/dashboard/logistics**, separate from the persisted organization-owned
shipment registry. It does not issue a booking, change a shipment status or create
real carrier events. It can prefill product/country/tonnage from an **approved PO**
in the currently visible organization. Preview orders are explicitly examples.

## Workflow

1. Choose food product, country (only supported geographic gateway references),
   shipment tonnes (0.1–200), delivery limit in days (1–120), and optionally
   a linked approved purchase order.
2. Optionally add carrier **freight quote rates in QAR/tonne**, one per mode.
   Empty rates always render **N/A**. No invented tariffs.
3. Click **Compare transport options**. The API requires authenticated user
   and optionally checks \`supply.view\` for an organization ID.
4. Review charts for relative screening-risk index, planning days and
   quotation-derived freight cost in QAR/kg; then compare every available
   geographic corridor and open the risk drivers for a selected option.
5. Ask a real forwarder or carrier for offered service, quote, routing, proof
   of cold chain, clearance and actual sailing/flight/road schedules.
6. Separately create the real shipment from an approved purchase order
   in the existing NFII Operations ledger. The intelligence screen **does not
   perform that mutation**.

Endpoint: \`GET /api/nfii/logistics/corridors?country=IN&commodity=rice&tonnes=20&limitDays=40\`

Optional QAR/tonne quotes: \`seaRate\`, \`airRate\`, \`roadRate\`. Quantity and
price are user inputs, not scraped rates or an offered commercial price.
Freight cost displays \`rate_qar_per_tonne * shipment_tonnes\` and
\`QAR/kg = rate_qar_per_tonne / 1000\`.
Insurance, drayage, port charges, demurrage, duties, reefer power and spoilage
are **not** included without documented quotes.

## Coverage and limitations

- 39 representative export-gateway countries. A reference hub means a
  geographic point **only**, not a confirmed port service, flight or
  cross-border trucking route. This is not all real routes worldwide.
- Modes: direct sea; optional sea via Jebel Ali and Salalah; direct air;
  candidate air transfer via Dubai; regional road (GCC + Jordan reference).
  These are **scenarios**, not airline/carrier services and not a claim that
  such connections operate today.
- **SeaRoutes** optional licensed route geometry and theoretical vessel
  duration, server-side \`SEAROUTES_API_KEY\`. API:
  https://developer.searoutes.com/reference/getsearoute.
  Routing endpoint returns geometry and voyage duration, **not** berth
  availability, carrier voyage ID or real shipment ETA.
  Missing SeaRoutes means sea distances are labelled
  **great-circle lower bounds** and sea ETA is **N/A**; not a simulated
  navigation time passed off as truth.
- **World Bank** country LPI via
  https://api.worldbank.org/v2/country/IN/indicator/LP.LPI.OVRL.XQ?format=json.
  LPI survey scores are historical (mostly 2023, not contemporary real-time
  performance). National ranking cannot measure a specific cargo lane.
- **Open-Meteo marine** only via licensed commercial
  \`OPEN_METEO_COMMERCIAL_API_KEY\` at the customer API host.
  The sampled **departing port grid** wave forecast cannot establish weather
  conditions for all sea legs, dates, or the arrival port.
  https://open-meteo.com/en/docs/marine-weather-api
- Air distance is a straight-line minimum, not an actual flight plan.
  Air time is a **planning assumption** (air distance / 750 km/h plus
  2.5 days handling, +1 day nominal transfer).
- Road distance is a **geometric estimate** (straight line x 1.4) and road
  transit time is a **heuristic** (km / 550 km/day + 1.4 day handling).
  No road directions engine, border status, driver constraints, permits or
  verified trucking service are connected.
- Screening risk (0–100) is a transparent **deterministic heuristic** and
  is **not** an observed disruption probability, disaster alert, political
  risk estimate, shipping insurance score, or official Qatar decision.
  Factors include unverified routes/schedules, LPI survey and vintage,
  fresh-food requirements, deadline pressure, extra transfers and lack
  of quotes. A missing provider raises uncertainty rather than declaring
  the situation safe.
- Fresh food constraints (e.g. lettuce, fresh milk and vegetables) reflect
  rough screening categories; specific SKU freshness, harvested date,
  packaging, pre-cooling and validated remaining shelf life must be supplied
  before a real decision.
- UN/LOCODE and airport labels are representative hints; no verification
  of shipping line service or Qatar import licences.

## Data governance

No external key returned to the browser or stored in the source.
The only network calls are built from an allowlist of known endpoints
and fixed origin hubs; the user cannot specify an external URL, vessel ID,
headers or path. The API is read-only and uses existing authentication.
No Supabase migrations or new database permissions were added.

Configured providers must be used under their commercial licence and rate
limits. A missing rate or sea routing service is never silently replaced
with a made-up number, and each corridor includes its evidence level.
