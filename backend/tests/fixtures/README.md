# Fixtures
These are hand-written inputs, requirement sets and a fake vendor catalog, with deliberate edge cases such as an unpriced SKU or an af-only PoE switch. Each story tests against these instead of waiting on upstream code.

Every later story tests against these, so they are frozen with the contracts: changing one means a `contractVersion` review.

## Index

| File | What it is | Status |
|---|---|---|
| `normalized-input/*.json` (4) | Questionnaire answers after Step 1 | Done |
| `requirements/*.json` (4) | Hand-derived Step 2 output for the same 4 scenarios | to write, second-person review |
| `requirements/*.derivation.md` (4) | The arithmetic behind each Requirements file | to write |
| `catalogs/synthetic-catalog-omada.json` | For exporting |
| `catalogs/synthetic-catalog-edgecases.json` | 15-20 SKUs, vendor `synthetic`, built from the edge cases below | Done |

## NormalizedInput scenarios

1. **Baseline**
2. **two-floors-fiber-vpn**: two floors, fiber uplink, "every minute matters" downtime answer, plus a VPN requirement.
3. **large-room-heavy**: enough large rooms to cross the large-room trigger (0.5), so dedicated APs are added on top of coverage and capacity.
4. **sparse-not-sure**: most optional answers are "not sure", so the fallbacks and flagged estimates run (including the Q6 x 17.5 m2 floor-area estimate; Q10 fallback bands stay `null`).

### Requirements derivation rule

A Requirements fixture is derived by hand from the worked numbers in the stories,
never by running the engine. Each one has a `*.derivation.md` that shows every
step and cites the story it came from. A second person re-derives it
independently and signs the bottom of the derivation file (name and date).
Until signed, the fixture does not count toward the AC.

## Synthetic Catalogs

* synthetic-catalog-edgecases.json - This file includes the following edge cases, so the selection logic can be built and tested immediately.
    * SYN-GW-002: Price = 0
    * SYN-GW-003: Dual-role gateway (switch + controller)
    * SYN-SW-002: PoE ports exist but poe_budget_w is omitted to test fallback logic
    * SYN-SW-003: Price is null; requires SFP conditional block validation.
    * SYN-AP-003: Missing max_power_draw_w to test budget failure
    * It also includes regular entries for testing.

* synthetic-catalog-omada.json - A snapshot of the Omada entries unmodified from NWP-SETUP-003.
