# Fixtures
These are hand-written inputs, requirement sets and a fake vendor catalog, with deliberate edge cases such as an unpriced SKU or an af-only PoE switch. Each story tests against these instead of waiting on upstream code.

## Input Fixtures

## Synthetic Catalogs

* synthetic-catalog-edgecases.json - This file includes the following edge cases, so the selection logic can be built and tested immediately.
    * SYN-GW-002: Price = 0
    * SYN-GW-003: Dual-role gateway (switch + controller)
    * SYN-SW-002: PoE ports exist but poe_budget_w is omitted to test fallback logic
    * SYN-SW-003: Price is null; requires SFP conditional block validation.
    * SYN-AP-003: Missing max_power_draw_w to test budget failure
    * It also includes regular entries for testing.
* synthetic-catalog-omada.json - A snapshot of the Omada entries unmodified from NWP-SETUP-003.
