const express = require('express');
const router = express.Router();

let generateMealPlan, generateMealImage, generateFullRecipe, buildGroceryList;
try {
  ({ generateMealPlan, generateMealImage, generateFullRecipe } = require('../services/GeminiService'));
  console.log('GeminiService loaded OK');
} catch (e) {
  console.error('Failed to load GeminiService:', e.message);
}
try {
  ({ buildGroceryList } = require('../services/GroceryListService'));
  console.log('GroceryListService loaded OK');
} catch (e) {
  console.error('Failed to load GroceryListService:', e.message);
}

// Generate a meal plan from user preferences
router.post('/generate', async (req, res) => {
  console.log('>>> /generate hit');
  try {
    const preferences = req.body;

    if (!preferences.mealsPerWeek || !preferences.servings) {
      return res.status(400).json({ error: 'mealsPerWeek and servings are required' });
    }

    console.log('>>> Calling Gemini...');
    const mealPlan = await generateMealPlan(preferences);
    console.log('>>> Gemini responded OK');
    res.json(mealPlan);
  } catch (err) {
    console.error('>>> Gemini error message:', err.message);
    console.error('>>> Gemini error status:', err.response?.status);
    console.error('>>> Gemini error data:', JSON.stringify(err.response?.data));
    const detail = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Unknown error';
    res.status(500).json({ error: String(detail) });
  }
});

// Generate image for a meal
router.post('/generate-image', async (req, res) => {
  try {
    const { mealDescription } = req.body;

    if (!mealDescription) {
      return res.status(400).json({ error: 'mealDescription is required' });
    }

    const imageData = await generateMealImage(mealDescription);
    if (imageData) {
      res.json({ imageUrl: imageData });
    } else {
      res.status(500).json({ error: 'Failed to generate image' });
    }
  } catch (err) {
    console.error('Error generating meal image:', err.message);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Generate full recipe (instructions + detailed ingredients) for a single meal
router.post('/generate-recipe', async (req, res) => {
  try {
    const { mealName, servings, baseIngredients, maxIngredients } = req.body;
    if (!mealName) return res.status(400).json({ error: 'mealName is required' });
    const recipe = await generateFullRecipe(mealName, servings || 2, { baseIngredients, maxIngredients });
    res.json(recipe);
  } catch (err) {
    console.error('Recipe generation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate recipe' });
  }
});

// Generate grocery list from meals
router.post('/grocery-list', async (req, res) => {
  try {
    const { meals } = req.body;

    if (!meals || !Array.isArray(meals)) {
      return res.status(400).json({ error: 'meals array is required' });
    }

    const groceryList = buildGroceryList(meals);
    res.json(groceryList);
  } catch (err) {
    console.error('Error generating grocery list:', err.message);
    res.status(500).json({ error: 'Failed to generate grocery list' });
  }
});

module.exports = router;
