'use strict';
// Every tunable number lives here (the specification's parameter register).
// Status tags: SOURCED, PARAM (team must confirm), ESTIMATE (flagged to the user), UNSOURCED (needs a citation).
// Use integer / basis-point arithmetic before ceil() to avoid floating-point drift (see NWP-ENGINE-004).

module.exports = Object.freeze({
  M2_PER_AP: 140,                          // SOURCED (~1,500 sq ft per AP)
  M2_PER_ROOM_FALLBACK: 17.5,              // ESTIMATE
  CEILING: { '6': 40, '6E': 55 },          // SOURCED: users per AP by Wi-Fi standard
  RT_LARGE: 0.5,                           // PARAM: large-room trigger, within the sourced 50-60% range
  U_HP: 0.65,                              // PARAM: High-Performance AP utilisation target (midpoint of 60-70%)
  G_BY_BAND: { '0-10': 0.15, '11-30': 0.30, '31+': 0.50 },  // PARAM: band upper bounds; Q25 = No -> 0
  POE_HEADROOM: 1.2,                       // SOURCED: 20% headroom, both plans
  POE_CLASS_W: { af: 15.4, at: 30, bt3: 60 },               // IEEE 802.3 PSE class maxima
  UPS_LOAD_RATIO: 0.8,                     // UNSOURCED: keep load <= 80% of UPS rating
  WALL_CABINET_MAX_U: 9,                   // PARAM: "not sure" housing threshold
  Q17_POE_DEFAULTS: {                      // UNSOURCED: verify against datasheets
    door_controller: true, smart_sensor: true, pos_terminal: false, network_printer: false, other: true,
  },
  BUDGET_BAND_EDGES_PHP: { entryMax: 15000, mainstreamMax: 40000 },
  // Q10 fallback bands: NOT YET DEFINED. Do not invent values (decision D6).
  Q10_FALLBACK_BANDS: null,
});
