'use strict';
// Power-protection recommendation (advisory only)
// Algorithm Step 3.8
// Consumes: normalized input
// Produces: recommendation text and recommendation level
// Rules: pure function (no I/O).

function recommendPower({ input }) {
  const upsRecommendationLevel =
    input.power === 'frequent'
      ? 'prominent'
      : 'advisory';

  return {
    upsRecommendation: 'UPS recommended for network equipment.',
    upsRecommendationLevel,
  };
}

module.exports = { recommendPower };
