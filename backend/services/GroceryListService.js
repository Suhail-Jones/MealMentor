const CATEGORY_ORDER = ['produce', 'meat', 'seafood', 'dairy', 'grains', 'canned', 'frozen', 'spices', 'other'];

function buildGroceryList(meals) {
  const ingredientMap = new Map();

  for (const meal of meals) {
    for (const ingredient of meal.ingredients) {
      const key = normalizeIngredientName(ingredient.name);
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key);
        // Add quantities if units match, otherwise keep separate
        if (existing.unit === ingredient.unit) {
          existing.totalQuantity += ingredient.quantity;
        } else {
          existing.totalQuantity += ingredient.quantity;
        }
      } else {
        ingredientMap.set(key, {
          name: ingredient.name,
          normalizedName: key,
          totalQuantity: ingredient.quantity,
          unit: ingredient.unit,
          category: ingredient.category || 'other',
        });
      }
    }
  }

  const items = Array.from(ingredientMap.values());

  // Group by category
  const byCategory = CATEGORY_ORDER
    .map(category => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      items: items.filter(i => i.category === category),
    }))
    .filter(cat => cat.items.length > 0);

  return { byCategory, totalItems: items.length };
}

function normalizeIngredientName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/s$/, ''); // naive singularization
}

module.exports = { buildGroceryList };
