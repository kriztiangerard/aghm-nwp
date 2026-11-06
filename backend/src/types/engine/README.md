# Recommendation engine (Lambda: Engine / BOM)

This folder is the deployable asset for the Engine Lambda (`Code.fromAsset('backend/src/engine')`, handler `lambda-handler.handler`).
Tests and fixtures live outside it, in `backend/tests/`, so they are not zipped.

## Rules
1. **Zero npm runtime dependencies.** Node built-ins only. Tests use `node --test`.
2. **Pure functions.** No database or network calls inside engine logic. Only `catalog-repository.js` may touch the database.
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
