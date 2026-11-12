# Recommendation engine (Lambda: Engine / BOM)

This folder contains the Engine Lambda entrypoint at `backend/src/types/engine/lambda-handler.js`. CDK bundles that entrypoint with handler `lambda-handler.handler`.
Tests and fixtures live outside it, in `backend/tests/`, so they are not zipped.

The handler accepts the frontend NetworkConfiguration (or legacy Q-numbered raw answers), normalizes it, derives requirements, loads vendor descriptors and canonical CatalogSku JSON from PostgreSQL, runs the vendor/plan orchestration, then timestamps and validates the result.

Before deploying, apply `backend/migrations/002_engine_catalog.sql` and populate `vendor.management_modes` and `engine_catalog_sku.catalog_sku`. The SKU JSON must satisfy `contracts.js` and contain the selector-specific fields required for that category. These canonical records are intentionally not synthesized from incomplete legacy device rows; verify the DB catalog and selector fields before enabling the endpoint.

The DB URL is fetched at runtime from the Secrets Manager secret `aghm-nwp/database`; `DB_SSL=true` and the bundled RDS CA are used for TLS. CDK imports the configured VPC and database security group. Ensure the Lambda security group can connect to PostgreSQL on port 5432 and private subnets can reach Secrets Manager (through NAT or a VPC endpoint). Deploy with `CDK_DEFAULT_ACCOUNT` set in `ap-southeast-1` so CDK can look up the VPC.

## Rules
1. **Keep runtime dependencies minimal.** The Lambda bundles `pg` and the AWS Secrets Manager client; tests use `node --test`.
2. **Pure engine steps.** No database or network calls inside requirement, selection, or assembly steps. Only `catalog-repository.js` loads DB records.
3. **One file per story.** Two people do not edit the same file. `params.js`, `contracts.js`, `index.js` belong to NWP-ENGINE-001 (Track A); change them by pull request.
4. **Constants come from `params.js`.** Use integer arithmetic before `ceil()`.
5. **Never drop silently.** Record assumptions with `addLedger`, advisories with `addFlag`, and gaps with `addUnmet`.
6. **Contracts are frozen on Day 1** (`contracts.js`). Changes need both sides' approval.

### Contract Bumping (Versioning)
*   **Major bump (e.g., v1 to v2):** When a required field is removed, renamed, or changed in a way that breaks backwards compatibility with existing engine steps.
*   **Minor bump (e.g., v1.0 to v1.1):** When a new optional or required field is added, but existing steps will not break if they ignore it.
*   **Patch bump:** Not typically used for data contracts unless fixing a typo in a documentation field that does not affect runtime logic.


## Ownership (sprint tracks)
| Track | Stories | Files |
|---|---|---|
| A | 001, 002 (+ stretch 018, 014, 015) | `lambda-handler.js`, `index.js`, `ctx.js`, `params.js`, `contracts.js`, `normalize.js`, `devices/enclosure.js`, `devices/power.js` |
| B | 004, 003 | `requirements/wireless.js`, `requirements/network.js`, `requirements/connectivity.js` |
| C | 007, 008, 010 | `select.js`, `devices/gateway.js`, `devices/aps.js` |
| D | 005, 011, 012, 013 | `requirements/devices.js`, `devices/poe.js`, `devices/switches.js`, `devices/optics.js` |

## Commands (run from `backend/`)
- `npm test` — run all `*.test.js` files
- `npm run chain` — run the fixture chain (`scripts/run-chain.js`)
