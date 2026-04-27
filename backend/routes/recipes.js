const express = require('express');
const router = express.Router();

// Placeholder — will query PostgreSQL once DB is connected
router.get('/', async (req, res) => {
  res.json({ message: 'Recipes endpoint ready' });
});

module.exports = router;
