import { useState } from 'react';
import MealImage from './MealImage';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function NutritionStamp({ label, value, unit }) {
  return (
    <div className="flex flex-col items-center justify-center bg-cream-warm border border-forest/25 px-2 py-2 paper-grain">
      <span className="font-mono text-[9px] uppercase tracking-editorial text-terracotta">{label}</span>
      <span className="font-serif text-lg text-forest leading-tight tabular-nums">{value}{unit}</span>
    </div>
  );
}

export default function MealPlanDisplay({ mealPlan, onAddToShopping, onDeleteMeal, recipes, setRecipes, loadingRecipe, setLoadingRecipe, addedMeals, setAddedMeals, imageCache, setImageCache }) {
  const [expandedMeal, setExpandedMeal] = useState(null);

  const generateRecipe = async (meal) => {
    const id = meal.id;
    setLoadingRecipe(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API}/api/meal-plan/generate-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealName: meal.name, servings: meal.servings }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (!data.ingredients?.length) throw new Error('Invalid recipe response');
      setRecipes(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      console.error('Failed to generate recipe:', err);
      setRecipes(prev => ({ ...prev, [id]: { _error: err.message } }));
    } finally {
      setLoadingRecipe(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAddToShopping = (id, ingredients) => {
    onAddToShopping(ingredients);
    setAddedMeals(prev => new Set([...prev, id]));
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Remove this recipe from your menu?')) {
      onDeleteMeal(id);
    }
  };

  return (
    <div className="px-5 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-forest/40" />
        <span className="font-mono text-[10px] uppercase tracking-editorial text-terracotta">
          {mealPlan.meals?.length} recipes · composed
        </span>
        <div className="h-px flex-1 bg-forest/40" />
      </div>

      <div className="space-y-4">
        {mealPlan.meals && mealPlan.meals.map((meal, idx) => {
          const id = meal.id ?? idx;
          const expanded = expandedMeal === id;
          const num = String(idx + 1).padStart(2, '0');
          return (
            <div
              key={id}
              className="anim-fade-up bg-cream-warm border border-paper paper-grain relative overflow-hidden"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              {/* Delete button (top-right, absolute) */}
              <button
                onClick={(e) => handleDelete(e, id)}
                className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full text-ink-muted hover:text-rust hover:bg-cream transition-all font-mono text-base leading-none"
                aria-label="Delete recipe"
                title="Remove from menu"
              >
                ×
              </button>

              {/* Summary */}
              <button
                onClick={() => setExpandedMeal(expanded ? null : id)}
                className="w-full text-left p-3 pr-10 flex items-center gap-3"
              >
                <MealImage
                  mealName={meal.name}
                  searchTerm={meal.image_search_term || meal.name}
                  imageCache={imageCache}
                  setImageCache={setImageCache}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[9px] tracking-editorial text-terracotta">№ {num}</span>
                    <span className="font-mono text-[9px] tracking-editorial text-ink-muted uppercase">Recipe</span>
                  </div>
                  <p className="font-serif text-base text-forest leading-tight mt-0.5">{meal.name}</p>
                  <p className={`text-xs text-ink-muted leading-snug mt-1 italic ${expanded ? '' : 'line-clamp-2'}`}>{meal.description}</p>
                  <div className="flex items-center gap-2 mt-2 font-mono text-[10px] tracking-editorial text-ink-soft tabular-nums">
                    <span>{meal.prep_time + meal.cook_time}m</span>
                    <span className="text-terracotta">·</span>
                    <span>{Math.round(meal.calories)} kcal</span>
                    <span className="text-terracotta">·</span>
                    <span>{Math.round(meal.protein_g)}g P</span>
                  </div>
                </div>
                <span className={`font-serif text-forest text-xl flex-shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                  ⌄
                </span>
              </button>

              {expanded && (
                <div className="border-t border-paper px-4 py-4 anim-fade">
                  {/* Nutrition */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <NutritionStamp label="Cal"     value={Math.round(meal.calories)}  unit=""  />
                    <NutritionStamp label="Protein" value={Math.round(meal.protein_g)} unit="g" />
                    <NutritionStamp label="Carbs"   value={Math.round(meal.carbs_g)}   unit="g" />
                    <NutritionStamp label="Fat"     value={Math.round(meal.fat_g)}     unit="g" />
                  </div>

                  {/* Time */}
                  <div className="flex gap-4 mb-4 border-y border-forest/15 py-3">
                    <div className="flex-1 text-center">
                      <p className="font-serif text-xl text-forest tabular-nums">{meal.prep_time}m</p>
                      <p className="font-mono text-[9px] uppercase tracking-editorial text-ink-muted">Prep</p>
                    </div>
                    <div className="w-px bg-forest/20" />
                    <div className="flex-1 text-center">
                      <p className="font-serif text-xl text-forest tabular-nums">{meal.cook_time}m</p>
                      <p className="font-mono text-[9px] uppercase tracking-editorial text-ink-muted">Cook</p>
                    </div>
                    <div className="w-px bg-forest/20" />
                    <div className="flex-1 text-center">
                      <p className="font-serif text-xl text-terracotta italic tabular-nums">{meal.prep_time + meal.cook_time}m</p>
                      <p className="font-mono text-[9px] uppercase tracking-editorial text-ink-muted">Total</p>
                    </div>
                  </div>

                  {!recipes[id] && meal.ingredients && (
                    <div className="mb-4">
                      <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— Ingredients —</p>
                      <div className="flex flex-wrap gap-1.5">
                        {meal.ingredients.map((ing, i) => (
                          <span key={i} className="bg-cream border border-forest/20 text-ink-soft text-xs px-2.5 py-1 rounded-full font-serif italic">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {recipes[id] && (recipes[id].ingredients?.length > 0 || recipes[id].instructions) && (
                    <div className="space-y-5 mb-4 anim-fade">
                      <div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="font-mono text-[10px] uppercase tracking-editorial text-terracotta">— Ingredients —</span>
                          <span className="font-serif italic text-xs text-ink-muted">({meal.servings} servings)</span>
                        </div>
                        <ul className="bg-cream border border-paper p-3 space-y-1.5">
                          {recipes[id].ingredients?.map((ing, i) => (
                            <li key={i} className="flex items-baseline gap-2 text-sm">
                              <span className="text-terracotta text-[10px]">✦</span>
                              <span>
                                <span className="font-serif text-forest tabular-nums">{ing.quantity} {ing.unit}</span>{' '}
                                <span className="font-serif italic text-ink-soft">{ing.name}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— Method —</p>
                        <ol className="space-y-3">
                          {(recipes[id].instructions || '').split('\n').filter(s => s.trim()).map((step, i) => {
                            const cleaned = step.replace(/^\d+\.\s*/, '');
                            return (
                              <li key={i} className="flex gap-3">
                                <span className="flex-shrink-0 font-serif italic text-3xl text-terracotta leading-none w-8 tabular-nums">
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="font-serif text-[15px] leading-relaxed text-ink pt-1">{cleaned}</span>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {(!recipes[id]?.ingredients?.length) && (
                      <button
                        onClick={() => generateRecipe(meal)}
                        disabled={loadingRecipe[id]}
                        className="flex-1 btn-forest py-2.5 font-mono uppercase tracking-editorial text-xs disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {loadingRecipe[id] ? (
                          <>
                            <span className="w-3 h-3 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                            Composing…
                          </>
                        ) : recipes[id]?._error ? (
                          <>Retry Recipe ↺</>
                        ) : (
                          <>Reveal Recipe ✦</>
                        )}
                      </button>
                    )}
                    {recipes[id]?._error && (
                      <p className="w-full font-mono text-[10px] text-rust uppercase tracking-editorial text-center py-1">
                        Generation failed — tap retry
                      </p>
                    )}
                    {recipes[id]?.ingredients?.length > 0 && (
                      <button
                        onClick={() => handleAddToShopping(id, recipes[id].ingredients)}
                        disabled={addedMeals.has(id)}
                        className={`flex-1 py-2.5 font-mono uppercase tracking-editorial text-xs transition-all
                          ${addedMeals.has(id)
                            ? 'bg-forest/10 text-forest border-2 border-forest/30 cursor-not-allowed'
                            : 'btn-terracotta'}`}
                      >
                        {addedMeals.has(id) ? '✓ Added to Market' : 'Send to Market →'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
