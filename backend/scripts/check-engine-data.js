require('dotenv/config');
const { loadEngineData, closeConnection } = require('../src/types/engine/catalog-repository.js');

(async () => {
  const d = await loadEngineData({ now: new Date() });
  console.log('vendors:', d.vendors.map((v) => v.name));
  const counts = {};
  d.catalog.forEach((s) => { const k = `${s.vendor} / ${s.category}`; counts[k] = (counts[k] || 0) + 1; });
  console.table(counts);
  console.log('rejected:', d.rejected);
  console.log('excluded:', d.excluded);
  console.log('lifecycle pending:', d.lifecycleRulesPending);
  console.log('notes:', d.notes);
  await closeConnection();
})().catch((e) => { console.error(e.code, e.message); process.exit(1); });