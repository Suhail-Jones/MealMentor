const express = require('express');
const router  = express.Router();

let lookupPrices, lookupSingle;
try {
  ({ lookupPrices, lookupSingle } = require('../services/PricingService'));
  console.log('PricingService loaded OK');
} catch (e) {
  console.error('Failed to load PricingService:', e.message);
}

router.post('/', async (req, res) => {
  res.json({ message: 'Prices endpoint ready' });
});

// Bulk (legacy)
router.post('/lookup', async (req, res) => {
  const { ingredients } = req.body;
  if (!Array.isArray(ingredients) || ingredients.length === 0)
    return res.status(400).json({ error: 'ingredients must be a non-empty array' });
  if (ingredients.length > 30)
    return res.status(400).json({ error: 'Maximum 30 ingredients per request' });
  try {
    const prices = await lookupPrices(ingredients);
    res.json({ prices });
  } catch (err) {
    console.error('Price lookup error:', err.message);
    res.status(500).json({ error: 'Failed to look up prices' });
  }
});

// Streaming: sends one SSE event per ingredient as results arrive
router.post('/lookup-stream', async (req, res) => {
  const { ingredients } = req.body;
  if (!Array.isArray(ingredients) || ingredients.length === 0)
    return res.status(400).json({ error: 'ingredients must be a non-empty array' });
  if (ingredients.length > 30)
    return res.status(400).json({ error: 'Maximum 30 ingredients per request' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for (const ingredient of ingredients) {
      const prices = await lookupSingle(ingredient);
      send({ ingredient, prices });
    }
  } catch (err) {
    console.error('Stream lookup error:', err.message);
    send({ error: err.message });
  } finally {
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

module.exports = router;
