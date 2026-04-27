import { useState } from 'react';
import axios from 'axios';
import Landing from './Landing';
import PreferencesForm from '../components/PreferencesForm';
import MealPlanDisplay from '../components/MealPlanDisplay';
import GroceryList from '../components/GroceryList';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MealPlanner() {
  const [hasStarted, setHasStarted] = useState(false);
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [shoppingItems, setShoppingItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [recipes, setRecipes] = useState({});
  const [loadingRecipe, setLoadingRecipe] = useState({});
  const [addedMeals, setAddedMeals] = useState(new Set());
  const [imageCache, setImageCache] = useState({});
  const [priceData, setPriceData] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState(null);

  const handleGenerateMealPlan = async (preferences) => {
    setLoading(true);
    setError(null);
    try {
      const { data: plan } = await axios.post(`${API}/api/meal-plan/generate`, preferences);
      setMealPlan(plan);
      setActiveTab('meals');
    } catch (err) {
      console.error('Full error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate meal plan');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToShopping = (ingredients) => {
    if (!Array.isArray(ingredients) || !ingredients.length) return;
    setShoppingItems(prev => {
      const updated = prev.map(cat => ({ ...cat, items: [...cat.items] }));
      for (const ing of ingredients) {
        const cat = updated.find(c => c.category === ing.category);
        if (cat) {
          const existing = cat.items.find(i => i.name === ing.name);
          if (existing) {
            existing.totalQuantity = (parseFloat(existing.totalQuantity) || 0) + (parseFloat(ing.quantity) || 0);
          } else {
            cat.items.push({ name: ing.name, totalQuantity: ing.quantity, unit: ing.unit });
          }
        } else {
          updated.push({ category: ing.category, items: [{ name: ing.name, totalQuantity: ing.quantity, unit: ing.unit }] });
        }
      }
      return updated;
    });
  };

  const handleComparePrices = async () => {
    const allIngredients = shoppingItems.flatMap(cat => cat.items.map(item => item.name));
    if (!allIngredients.length) return;
    setPriceLoading(true);
    setPriceError(null);
    setPriceData({});

    try {
      const res = await fetch(`${API}/api/prices/lookup-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: allIngredients }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch prices');
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { setPriceLoading(false); return; }
          try {
            const { ingredient, prices, error } = JSON.parse(payload);
            if (error) { setPriceError(error); continue; }
            setPriceData(prev => ({ ...prev, [ingredient]: prices }));
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setPriceError(err.message);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleClearShopping = () => {
    setShoppingItems([]);
    setCheckedItems(new Set());
    setAddedMeals(new Set());
    setPriceData(null);
    setPriceError(null);
  };

  const tabTitles = {
    generate: 'The Kitchen',
    meals:    'The Menu',
    shopping: 'The Market',
  };
  const tabIssues = {
    generate: 'Compose your plan',
    meals:    mealPlan ? `${mealPlan.meals?.length} recipes ready` : '',
    shopping: 'Source & compare',
  };

  if (!hasStarted) {
    return <Landing onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="h-screen flex flex-col max-w-md mx-auto relative bg-paper paper-grain">

      {loading && (
        <div className="absolute inset-0 z-50 bg-cream/95 paper-grain flex flex-col items-center justify-center gap-5 anim-fade">
          <div className="relative">
            <svg className="w-20 h-20 anim-rotate-seal" viewBox="0 0 100 100">
              <defs>
                <path id="loop-path" d="M 50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
              </defs>
              <text className="font-mono" fontSize="7" letterSpacing="3" fill="var(--forest)">
                <textPath href="#loop-path">COMPOSING · SEASONING · TASTING · COMPOSING · </textPath>
              </text>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl anim-float">🌿</span>
          </div>
          <div className="text-center">
            <p className="font-serif text-xl italic text-forest">Composing your menu</p>
            <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-muted mt-2">The AI chef is tasting...</p>
          </div>
        </div>
      )}

      {/* Editorial header */}
      <header className="flex-shrink-0 bg-cream-warm border-b border-paper px-5 pt-4 pb-3 relative">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[9px] uppercase tracking-editorial text-terracotta">№ {activeTab === 'generate' ? '01' : activeTab === 'meals' ? '02' : '03'}</span>
            <h1 className="font-serif text-2xl text-forest leading-none">
              {tabTitles[activeTab]}
            </h1>
          </div>
          <div className="w-9 h-9 rounded-full border-2 border-forest flex items-center justify-center bg-cream">
            <span className="font-serif italic text-forest text-sm">M</span>
          </div>
        </div>
        {tabIssues[activeTab] && (
          <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-muted mt-1">{tabIssues[activeTab]}</p>
        )}
        <div className="squiggle-line mt-2 -mx-5" />
        {error && (
          <div className="mt-2 border border-rust bg-cream text-rust px-3 py-2 text-sm font-mono">
            <span className="font-bold">ERR · </span>{error}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'generate' && (
          <div key="generate" className="flex-1 flex flex-col anim-fade overflow-hidden">
            <PreferencesForm onSubmit={handleGenerateMealPlan} loading={loading} />
          </div>
        )}
        {activeTab === 'meals' && (
          <div key="meals" className="flex-1 overflow-y-auto anim-fade">
            {mealPlan
              ? <MealPlanDisplay
                  mealPlan={mealPlan}
                  onAddToShopping={handleAddToShopping}
                  recipes={recipes}
                  setRecipes={setRecipes}
                  loadingRecipe={loadingRecipe}
                  setLoadingRecipe={setLoadingRecipe}
                  addedMeals={addedMeals}
                  setAddedMeals={setAddedMeals}
                  imageCache={imageCache}
                  setImageCache={setImageCache}
                />
              : <EmptyState symbol="📖" title="No menu yet" message="Compose a plan to fill these pages" />
            }
          </div>
        )}
        {activeTab === 'shopping' && (
          <div key="shopping" className="flex-1 overflow-y-auto anim-fade">
            <GroceryList
              shoppingItems={shoppingItems}
              setShoppingItems={setShoppingItems}
              checkedItems={checkedItems}
              setCheckedItems={setCheckedItems}
              onClearAll={handleClearShopping}
              priceData={priceData}
              priceLoading={priceLoading}
              priceError={priceError}
              onComparePrices={handleComparePrices}
            />
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} mealsReady={!!mealPlan} />
    </div>
  );
}

function EmptyState({ symbol, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center anim-fade">
      <div className="w-20 h-20 rounded-full border-2 border-forest flex items-center justify-center text-4xl bg-cream-warm anim-float">
        {symbol}
      </div>
      <h3 className="font-serif text-2xl text-forest italic">{title}</h3>
      <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-muted max-w-xs">{message}</p>
      <div className="squiggle-line w-32 mt-2" />
    </div>
  );
}
