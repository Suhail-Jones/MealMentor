const axios = require('axios');

// Stable production models
const GEMINI_API_URL       = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_FALLBACK_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
const GEMINI_IMAGE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent';

const BATCH_SIZE = 1;

const CUISINE_ROTATION = [
  'Italian', 'Mexican', 'Indian', 'Thai', 'Japanese', 'Greek',
  'Middle Eastern', 'Korean', 'Vietnamese', 'Ethiopian', 'Spanish',
  'Moroccan', 'American Southern', 'Chinese', 'Turkish', 'Peruvian',
];

async function generateMealPlan(preferences) {
  // Non-streaming wrapper: collects results from streaming variant.
  const meals = [];
  await generateMealPlanStream(preferences, (meal) => {
    if (meal) meals.push(meal);
  });
  return { meals };
}

// Streaming generator: invokes onMeal(meal, idx, total, err?) as each meal completes.
// Uses bounded concurrency (CONCURRENCY workers) for big wall-time speedup vs serial.
async function generateMealPlanStream(preferences, onMeal) {
  const { mealsPerWeek, servings, dietaryRestrictions, allergies, macroPreferences, foodPreferences, recipeStyle } = preferences;
  const total = mealsPerWeek;

  const shuffledCuisines = [...CUISINE_ROTATION].sort(() => Math.random() - 0.5);
  const userCuisines = foodPreferences?.Cuisines ?? [];

  // Build per-meal task list with assigned cuisine
  const tasks = [];
  for (let i = 0; i < total; i++) {
    const cuisineHint = userCuisines.length > 0
      ? userCuisines[i % userCuisines.length]
      : shuffledCuisines[i % shuffledCuisines.length];
    tasks.push({ idx: i, cuisineHint });
  }

  const CONCURRENCY = 4;
  let nextTask = 0;
  const completed = []; // shared so later workers see earlier names for diversity

  async function worker() {
    while (true) {
      const myTask = nextTask++;
      if (myTask >= tasks.length) return;
      const { idx, cuisineHint } = tasks[myTask];
      try {
        const meals = await generateBatchWithRetry(
          1, servings, dietaryRestrictions, allergies,
          macroPreferences, foodPreferences ?? {}, cuisineHint,
          3, completed.map(m => m.name), recipeStyle ?? {}
        );
        for (const meal of meals) {
          completed.push(meal);
          try { onMeal(meal, idx, total, null); } catch {}
        }
      } catch (err) {
        try { onMeal(null, idx, total, err); } catch {}
      }
    }
  }

  const workerCount = Math.min(CONCURRENCY, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateBatchWithRetry(count, servings, dietaryRestrictions, allergies, macroPreferences, foodPreferences, cuisineHint, retries = 5, alreadyGenerated = [], recipeStyle = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    // Use fallback model after 2nd failure
    const useFallback = attempt > 2;
    try {
      return await generateBatch(count, servings, dietaryRestrictions, allergies, macroPreferences, foodPreferences, cuisineHint, alreadyGenerated, useFallback, recipeStyle);
    } catch (err) {
      const status = err.response?.status;
      if (attempt === retries) throw err;
      // Only retry on transient errors
      if (status && status !== 503 && status !== 429 && status !== 500) throw err;
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 30000); // exp backoff, cap 30s
      console.log(`Batch attempt ${attempt} failed (${status || 'parse error'}: ${err.message?.slice(0, 120)}), retrying in ${delay/1000}s${attempt > 2 ? ' [fallback model]' : ''}...`);
      await sleep(delay);
    }
  }
}

async function generateBatch(count, servings, dietaryRestrictions, allergies, macroPreferences, foodPreferences, cuisineHint, alreadyGenerated = [], useFallback = false, recipeStyle = {}) {
  const apiUrl = useFallback ? GEMINI_FALLBACK_URL : GEMINI_API_URL;
  const macroDesc = buildMacroDescription(macroPreferences);
  const dietaryDesc = dietaryRestrictions.length > 0
    ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}.`
    : '';
  const allergyDesc = allergies ? `Allergies to avoid: ${allergies}.` : '';
  const foodPrefDesc = buildFoodPreferencesDescription(foodPreferences);
  const styleDesc = buildRecipeStyleDescription(recipeStyle);

  const alreadyNote = alreadyGenerated.length > 0
    ? `ALREADY GENERATED — do NOT repeat or make anything similar to: ${alreadyGenerated.join(', ')}.`
    : '';

  const prompt = `
You are a professional nutritionist and chef. Generate exactly ${count} meal(s).

CUISINE FOCUS FOR THIS MEAL: ${cuisineHint}
Base this meal in ${cuisineHint} culinary tradition. Use authentic ingredients and techniques from that cuisine.

DIVERSITY RULES (strictly enforce):
- This meal MUST be rooted in ${cuisineHint} cuisine.
- Use a protein, vegetable, and cooking method authentic to ${cuisineHint} cooking.
- DO NOT default to overused "healthy food" clichés: no plain salmon+asparagus, no generic grain bowls, no chicken+broccoli+quinoa combos unless they are genuinely traditional to the cuisine.
- Vary the cooking method (braise, stir-fry, grill, roast, steam, raw, bake, etc.).
- Make it a dish a home cook would be genuinely excited to make.
${alreadyNote}

${foodPrefDesc}

Requirements:
- ${servings} servings per meal
- ${dietaryDesc}
- ${allergyDesc}
- ${macroDesc}
${styleDesc}

Respond ONLY with valid JSON in this exact format, no extra text:
{
  "meals": [
    {
      "name": "Meal Name",
      "description": "One sentence description of the dish",
      "image_search_term": "grilled chicken with broccoli and lemon",
      "servings": ${servings},
      "prep_time": 15,
      "cook_time": 20,
      "calories": 500,
      "protein_g": 30,
      "carbs_g": 45,
      "fat_g": 15,
      "ingredients": ["chicken breast", "broccoli florets", "olive oil", "garlic", "lemon"]
    }
  ]
}
`;

  const response = await axios.post(
    `${apiUrl}?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 2048,
        // Disable thinking tokens — Gemini 2.5 reserves part of output budget for "reasoning"
        // which can starve actual JSON output and cause truncation/parse errors.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }
  );

  const rawText = response.data.candidates[0].content.parts[0].text;
  let jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  // If model wrapped JSON in prose, extract first {...} block
  if (!jsonText.startsWith('{')) {
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.warn('[generateBatch] JSON parse failed. Raw output (first 300 chars):', rawText.slice(0, 300));
    throw e;
  }
  return parsed.meals;
}

function buildFoodPreferencesDescription(foodPreferences) {
  if (!foodPreferences) return '';
  const lines = [];
  const proteins = foodPreferences.Proteins ?? [];
  const veggies  = foodPreferences.Vegetables ?? [];
  const grains   = foodPreferences['Grains & Carbs'] ?? [];
  const cuisines = foodPreferences.Cuisines ?? [];

  if (proteins.length) lines.push(`Preferred proteins (use these): ${proteins.join(', ')}.`);
  if (veggies.length)  lines.push(`Preferred vegetables (include these): ${veggies.join(', ')}.`);
  if (grains.length)   lines.push(`Preferred grains/carbs (use these): ${grains.join(', ')}.`);
  if (cuisines.length) lines.push(`Preferred cuisines: ${cuisines.join(', ')}.`);

  if (!lines.length) return '';
  return `USER FOOD PREFERENCES (prioritize these):\n${lines.join('\n')}`;
}

function buildRecipeStyleDescription(recipeStyle) {
  if (!recipeStyle) return '';
  const { cookTime, complexity, maxIngredients, budgetLevel, occasion } = recipeStyle;
  const lines = [];

  if (cookTime) lines.push(`Total cook + prep time must be ≤ ${cookTime} minutes. Keep it quick.`);

  const complexityMap = {
    simple:   'Complexity: EASY — minimal steps, common techniques only, quick cleanup. Perfect for weeknights.',
    moderate: 'Complexity: MODERATE — some technique allowed (searing, reducing, marinating), but still approachable.',
    advanced: 'Complexity: ADVANCED — complex techniques, longer processes, and restaurant-quality execution welcome.',
  };
  if (complexity && complexity !== 'any') lines.push(complexityMap[complexity]);

  if (maxIngredients) lines.push(`Use NO MORE than ${maxIngredients} ingredients total (including pantry staples like salt, oil, pepper).`);

  const budgetMap = {
    budget:   'Budget: Use affordable everyday ingredients — no premium cuts, no specialty items.',
    moderate: 'Budget: Mid-range ingredients OK — quality pantry staples, common supermarket finds.',
    premium:  'Budget: Premium ingredients welcome — quality cuts, specialty cheeses, fresh herbs, artisan products.',
  };
  if (budgetLevel && budgetLevel !== 'any') lines.push(budgetMap[budgetLevel]);

  const occasionMap = {
    weeknight: 'Occasion: WEEKNIGHT MEAL — fast, minimal prep, few dishes to wash.',
    weekend:   'Occasion: WEEKEND PROJECT — more involved preparation, longer cook times, impressive results.',
    mealprep:  'Occasion: MEAL PREP — scales well, keeps in fridge 4+ days, reheats easily.',
  };
  if (occasion && occasion !== 'any') lines.push(occasionMap[occasion]);

  if (!lines.length) return '';
  return `RECIPE STYLE CONSTRAINTS (strictly follow):\n${lines.join('\n')}`;
}

function buildMacroDescription(macroPreferences) {
  const { type, calorieTarget, proteinGrams, carbsGrams, fatGrams } = macroPreferences;

  const presetDescriptions = {
    balanced: 'Balanced macros with moderate protein, carbs, and fat.',
    highProtein: `High protein meals. Target: ~${proteinGrams}g protein, ~${carbsGrams}g carbs, ~${fatGrams}g fat per day.`,
    lowCarb: `Low carbohydrate meals. Target: ~${proteinGrams}g protein, ~${carbsGrams}g carbs (keep under 100g), ~${fatGrams}g fat per day.`,
    lowCalorie: `Low calorie meals. Target: ~${calorieTarget} total daily calories with ${proteinGrams}g protein, ${carbsGrams}g carbs, ${fatGrams}g fat.`,
    custom: `Custom macros per day: ${calorieTarget} calories, ${proteinGrams}g protein, ${carbsGrams}g carbs, ${fatGrams}g fat.`,
  };

  return presetDescriptions[type] || presetDescriptions.balanced;
}

async function generateMealImage(searchTerm) {
  const fallbacks = [
    searchTerm,
    searchTerm.split(' ').slice(0, 2).join(' '),
    'healthy food meal',
  ];

  for (const query of fallbacks) {
    try {
      const response = await axios.get('https://api.pexels.com/v1/search', {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: { query, per_page: 5, orientation: 'square' },
      });
      const photos = response.data.photos;
      if (photos && photos.length > 0) {
        const pick = photos[Math.floor(Math.random() * photos.length)];
        return pick.src.medium;
      }
    } catch (err) {
      console.error(`Pexels search failed for "${query}":`, err.message);
    }
  }

  return null;
}

async function generateFullRecipe(mealName, servings, opts = {}) {
  const { baseIngredients, maxIngredients } = opts;

  const baseIngredientsBlock = Array.isArray(baseIngredients) && baseIngredients.length
    ? `\nSTRICT INGREDIENT LIST — you MUST use ONLY these base ingredients (add quantities/units, but do not add new ingredients):\n${baseIngredients.map(i => `- ${i}`).join('\n')}\n`
    : '';

  const maxIngredientsRule = Number.isFinite(maxIngredients) && maxIngredients > 0
    ? `\nHARD LIMIT: The "ingredients" array MUST contain ${maxIngredients} or fewer items. This is non-negotiable. Combine or omit minor ingredients (salt/pepper/oil count toward the limit).\n`
    : '';

  const prompt = `
You are a professional chef. Generate a detailed recipe for "${mealName}" with ${servings} servings.
${baseIngredientsBlock}${maxIngredientsRule}
Rules for ingredients:
- The "name" field must be the BASE ingredient only — no prep instructions, no cooking method, no cut descriptions.
  WRONG: "red bell pepper, cut into 1-inch pieces" | "boneless lamb shoulder, cut into 1-inch cubes" | "garlic, minced"
  RIGHT: "red bell pepper" | "lamb shoulder" | "garlic"
- Use SPECIFIC names. Never say "vegetables" — say "broccoli" or "spinach".
- Include exact quantities and units.
- Put all prep details (minced, diced, cut into cubes, etc.) in the instructions steps only.

Rules for instructions:
- Write exactly 4-6 numbered steps.
- Each step must include specific quantities and prep details.
- Never use vague phrases like "season to taste" without specifics.

Respond ONLY with valid JSON in this exact format, no extra text:
{
  "instructions": "1. Heat 1 tbsp olive oil in a pan over medium heat.\\n2. Add 3 cloves minced garlic and cook for 1 minute.\\n3. Add 200g chicken breast cut into cubes and cook for 6 minutes per side.\\n4. Add 2 cups broccoli florets and 1/4 cup chicken broth, cook 5 minutes.\\n5. Season with 1/2 tsp salt and 1/4 tsp black pepper. Serve hot.",
  "ingredients": [
    { "name": "chicken breast", "quantity": 200, "unit": "g", "category": "meat" },
    { "name": "broccoli", "quantity": 2, "unit": "cups", "category": "produce" }
  ]
}

Categories must be one of: produce, dairy, meat, seafood, grains, canned, spices, frozen, other.
`;

  let rawText;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const useFallback = attempt > 2;
    const url = useFallback ? GEMINI_FALLBACK_URL : GEMINI_API_URL;
    try {
      const response = await axios.post(
        `${url}?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }
      );
      rawText = response.data.candidates[0].content.parts[0].text;
      break;
    } catch (err) {
      const status = err.response?.status;
      if (attempt === 5) throw err;
      if (status && status !== 503 && status !== 429 && status !== 500) throw err;
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
      console.log(`[generateFullRecipe] attempt ${attempt} failed (${status}), retry in ${delay/1000}s${useFallback ? ' [fallback]' : ''}...`);
      await sleep(delay);
    }
  }
  console.log('[generateFullRecipe] raw:', rawText.slice(0, 300));

  // Strip markdown fences
  let jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // If still not valid JSON, extract first {...} block
  if (!jsonText.startsWith('{')) {
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
  }

  const parsed = JSON.parse(jsonText);

  // Normalise: some models nest under a key
  if (!parsed.ingredients && !parsed.instructions) {
    const inner = Object.values(parsed)[0];
    if (inner && (inner.ingredients || inner.instructions)) return inner;
  }

  if (!parsed.ingredients || parsed.ingredients.length === 0) {
    console.warn('[generateFullRecipe] ingredients empty in parsed result:', parsed);
  }

  // Hard-enforce maxIngredients cap (model sometimes ignores)
  if (Number.isFinite(maxIngredients) && maxIngredients > 0 && Array.isArray(parsed.ingredients) && parsed.ingredients.length > maxIngredients) {
    console.warn(`[generateFullRecipe] model returned ${parsed.ingredients.length} ingredients, trimming to ${maxIngredients}`);
    parsed.ingredients = parsed.ingredients.slice(0, maxIngredients);
  }

  return parsed;
}

module.exports = { generateMealPlan, generateMealPlanStream, generateMealImage, generateFullRecipe };
