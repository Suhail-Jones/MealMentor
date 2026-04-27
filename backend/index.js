const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`>>> ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/meal-plan', require('./routes/mealPlan'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/prices', require('./routes/prices'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', geminiKeySet: !!process.env.GEMINI_API_KEY });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Gemini API key loaded: ${!!process.env.GEMINI_API_KEY}`);
});
