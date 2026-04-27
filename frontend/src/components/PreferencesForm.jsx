import { useState } from 'react';
import StepIndicator from './StepIndicator';

const dietaryOptions = {
  'Diet Style': ['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo'],
  'Intolerances': ['Gluten-Free', 'Dairy-Free', 'Low-Sodium', 'Low-Sugar'],
  'No Meat': ['No Pork', 'No Beef', 'No Chicken', 'No Turkey', 'No Lamb', 'No Fish', 'No Shellfish', 'No Red Meat'],
};

const foodPreferenceOptions = {
  Proteins: [
    { label: 'Chicken', emoji: '🍗' }, { label: 'Beef', emoji: '🥩' },
    { label: 'Pork', emoji: '🐷' }, { label: 'Lamb', emoji: '🫙' },
    { label: 'Turkey', emoji: '🦃' }, { label: 'Fish', emoji: '🐟' },
    { label: 'Shrimp', emoji: '🦐' }, { label: 'Crab & Lobster', emoji: '🦞' },
    { label: 'Tofu', emoji: '🫘' }, { label: 'Eggs', emoji: '🥚' },
    { label: 'Beans & Lentils', emoji: '🌱' },
  ],
  Vegetables: [
    { label: 'Leafy Greens', emoji: '🥬' }, { label: 'Root Vegetables', emoji: '🥕' },
    { label: 'Broccoli', emoji: '🥦' }, { label: 'Bell Peppers', emoji: '🫑' },
    { label: 'Mushrooms', emoji: '🍄' }, { label: 'Zucchini', emoji: '🥒' },
    { label: 'Corn', emoji: '🌽' }, { label: 'Tomatoes', emoji: '🍅' },
    { label: 'Eggplant', emoji: '🍆' }, { label: 'Sweet Potato', emoji: '🍠' },
  ],
  'Grains & Carbs': [
    { label: 'Rice', emoji: '🍚' }, { label: 'Pasta', emoji: '🍝' },
    { label: 'Bread & Wraps', emoji: '🫓' }, { label: 'Potatoes', emoji: '🥔' },
    { label: 'Oats', emoji: '🌾' }, { label: 'Quinoa', emoji: '🌿' },
    { label: 'Noodles', emoji: '🍜' },
  ],
  Cuisines: [
    { label: 'Italian', emoji: '🍕' }, { label: 'Mexican', emoji: '🌮' },
    { label: 'Indian', emoji: '🍛' }, { label: 'Thai', emoji: '🍜' },
    { label: 'Japanese', emoji: '🍣' }, { label: 'Chinese', emoji: '🥟' },
    { label: 'Greek', emoji: '🫒' }, { label: 'Mediterranean', emoji: '🥙' },
    { label: 'Middle Eastern', emoji: '🧆' }, { label: 'American', emoji: '🍔' },
    { label: 'Korean', emoji: '🍱' }, { label: 'Vietnamese', emoji: '🍲' },
  ],
};

const macroPresets = {
  balanced:    { calorieTarget: 2000, proteinGrams: 50,  carbsGrams: 250, fatGrams: 65  },
  highProtein: { calorieTarget: 2200, proteinGrams: 150, carbsGrams: 180, fatGrams: 73  },
  lowCarb:     { calorieTarget: 1800, proteinGrams: 100, carbsGrams: 50,  fatGrams: 100 },
  lowCalorie:  { calorieTarget: 1500, proteinGrams: 40,  carbsGrams: 150, fatGrams: 50  },
};

const presetLabels = {
  balanced: 'Balanced', highProtein: 'High Protein',
  lowCarb: 'Low Carb', lowCalorie: 'Low Calorie',
};

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-all
        ${active
          ? 'bg-forest text-cream border-forest shadow-[2px_2px_0_var(--terracotta)]'
          : 'bg-cream text-ink-soft border-forest/20 hover:border-forest/50'}`}
    >
      {children}
    </button>
  );
}

function SectionHeader({ num, title, subtitle }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-2">
        <span className="font-serif italic text-terracotta text-lg">{num}.</span>
        <h2 className="font-serif text-2xl text-forest leading-tight">{title}</h2>
      </div>
      {subtitle && <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-muted mt-1">{subtitle}</p>}
      <div className="squiggle-line mt-2" />
    </div>
  );
}

function Counter({ value, onDec, onInc }) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={onDec}
        className="w-10 h-10 rounded-full border-2 border-forest text-forest font-serif text-xl hover:bg-forest hover:text-cream transition-all">−</button>
      <span className="font-serif text-5xl text-forest italic w-14 text-center leading-none tabular-nums">{value}</span>
      <button type="button" onClick={onInc}
        className="w-10 h-10 rounded-full border-2 border-forest text-forest font-serif text-xl hover:bg-forest hover:text-cream transition-all">+</button>
    </div>
  );
}

const cookTimeOptions = [
  { label: 'Any',     value: null },
  { label: '15 min',  value: 15   },
  { label: '30 min',  value: 30   },
  { label: '45 min',  value: 45   },
  { label: '60 min',  value: 60   },
  { label: '90+ min', value: 90   },
];

const complexityOptions = [
  { value: 'any',      label: 'Any',       desc: 'No preference' },
  { value: 'simple',   label: 'Easy',      desc: 'Weeknight-friendly, minimal steps' },
  { value: 'moderate', label: 'Moderate',  desc: 'Some technique, still approachable' },
  { value: 'advanced', label: 'Challenge', desc: 'Complex techniques welcome' },
];

const ingredientOptions = [
  { label: 'Any',  value: null },
  { label: '≤ 5',  value: 5   },
  { label: '≤ 8',  value: 8   },
  { label: '≤ 10', value: 10  },
  { label: '≤ 15', value: 15  },
];

const budgetOptions = [
  { value: 'any',      label: 'Any',      desc: 'No preference' },
  { value: 'budget',   label: 'Budget',   desc: 'Everyday affordable ingredients' },
  { value: 'moderate', label: 'Moderate', desc: 'Mid-range pantry staples' },
  { value: 'premium',  label: 'Premium',  desc: 'Quality cuts, specialty items' },
];

const occasionOptions = [
  { label: 'Any',          value: 'any'      },
  { label: 'Weeknight',    value: 'weeknight' },
  { label: 'Weekend Cook', value: 'weekend'  },
  { label: 'Meal Prep',    value: 'mealprep' },
];

export default function PreferencesForm({ onSubmit, loading }) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    mealsPerWeek: 5,
    servings: 2,
    dietaryRestrictions: [],
    allergies: '',
    foodPreferences: { Proteins: [], Vegetables: [], 'Grains & Carbs': [], Cuisines: [] },
    macroPreferences: { type: 'balanced', calorieTarget: 2000, proteinGrams: 50, carbsGrams: 250, fatGrams: 65 },
    recipeStyle: {
      cookTime: null,
      complexity: 'any',
      maxIngredients: null,
      budgetLevel: 'any',
      occasion: 'any',
    },
  });

  const set = (key, value) => setPreferences(p => ({ ...p, [key]: value }));
  const setStyle = (key, value) => setPreferences(p => ({
    ...p, recipeStyle: { ...p.recipeStyle, [key]: value }
  }));

  const toggleDiet = (diet) => {
    set('dietaryRestrictions',
      preferences.dietaryRestrictions.includes(diet)
        ? preferences.dietaryRestrictions.filter(d => d !== diet)
        : [...preferences.dietaryRestrictions, diet]
    );
  };

  const toggleFoodPref = (category, label) => {
    setPreferences(p => {
      const current = p.foodPreferences[category] ?? [];
      const next = current.includes(label) ? current.filter(x => x !== label) : [...current, label];
      return { ...p, foodPreferences: { ...p.foodPreferences, [category]: next } };
    });
  };

  const applyPreset = (preset) => {
    setPreferences(p => ({
      ...p,
      macroPreferences: { ...p.macroPreferences, type: preset, ...macroPresets[preset] },
    }));
  };

  const setMacro = (field, value) => {
    setPreferences(p => ({
      ...p,
      macroPreferences: { ...p.macroPreferences, [field]: parseFloat(value) },
    }));
  };

  const handleSubmit = () => onSubmit(preferences);
  const totalSelected = Object.values(preferences.foodPreferences).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
        <StepIndicator current={step} total={5} />

        {step === 1 && (
          <div className="space-y-8 anim-fade">
            <SectionHeader num="I" title="The Basics" subtitle="Portions & yield" />

            <div>
              <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-1">Recipes</p>
              <p className="font-serif text-base text-ink-soft italic mb-4">How many unique dishes?</p>
              <Counter
                value={preferences.mealsPerWeek}
                onDec={() => set('mealsPerWeek', Math.max(1, preferences.mealsPerWeek - 1))}
                onInc={() => set('mealsPerWeek', Math.min(7, preferences.mealsPerWeek + 1))}
              />
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-1">Servings</p>
              <p className="font-serif text-base text-ink-soft italic mb-4">Cooking for how many?</p>
              <Counter
                value={preferences.servings}
                onDec={() => set('servings', Math.max(1, preferences.servings - 1))}
                onInc={() => set('servings', Math.min(10, preferences.servings + 1))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 anim-fade">
            <SectionHeader num="II" title="Dietary Notes" subtitle="Restrictions & allergies" />

            {Object.entries(dietaryOptions).map(([group, options]) => (
              <div key={group}>
                <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— {group} —</p>
                <div className="flex flex-wrap gap-2">
                  {options.map(diet => (
                    <Pill key={diet} active={preferences.dietaryRestrictions.includes(diet)} onClick={() => toggleDiet(diet)}>
                      {diet}
                    </Pill>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— Allergies —</p>
              <input
                type="text"
                value={preferences.allergies}
                onChange={e => set('allergies', e.target.value)}
                placeholder="peanuts, shellfish, dairy…"
                className="w-full bg-transparent border-b-2 border-forest/30 focus:border-forest font-serif text-lg italic text-ink px-1 py-2 outline-none transition-colors placeholder:text-ink-muted/60"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 anim-fade">
            <SectionHeader
              num="III"
              title="Favorites"
              subtitle={totalSelected > 0 ? `${totalSelected} selected — will prioritize` : 'Leave blank for maximum variety'}
            />

            {Object.entries(foodPreferenceOptions).map(([category, options]) => {
              const selected = preferences.foodPreferences[category] ?? [];
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta">— {category} —</p>
                    {selected.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreferences(p => ({
                          ...p,
                          foodPreferences: { ...p.foodPreferences, [category]: [] }
                        }))}
                        className="font-mono text-[10px] uppercase tracking-editorial text-ink-muted hover:text-rust transition"
                      >
                        clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.map(({ label, emoji }) => (
                      <Pill key={label} active={selected.includes(label)} onClick={() => toggleFoodPref(category, label)}>
                        <span className="inline-flex items-center gap-1.5">
                          <span>{emoji}</span><span>{label}</span>
                        </span>
                      </Pill>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 anim-fade">
            <SectionHeader num="IV" title="Nutrition" subtitle="Preset or custom macros" />

            <div className="grid grid-cols-2 gap-2">
              {Object.keys(macroPresets).map(preset => {
                const active = preferences.macroPreferences.type === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`py-3 px-3 rounded-lg border-2 font-serif text-base transition-all
                      ${active
                        ? 'bg-forest text-cream border-forest shadow-[2px_2px_0_var(--terracotta)]'
                        : 'bg-cream text-forest border-forest/20 hover:border-forest/50'}`}
                  >
                    {presetLabels[preset]}
                  </button>
                );
              })}
            </div>

            <div className="bg-cream-warm border border-paper p-4 paper-grain space-y-5">
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-editorial text-terracotta">Daily Calories</span>
                  <span className="font-serif text-2xl italic text-forest tabular-nums">{preferences.macroPreferences.calorieTarget}</span>
                </div>
                <input
                  type="range"
                  min="1200" max="3500" step="100"
                  value={preferences.macroPreferences.calorieTarget}
                  onChange={e => setMacro('calorieTarget', e.target.value)}
                  className="w-full accent-forest"
                />
                <div className="flex justify-between font-mono text-[10px] text-ink-muted mt-1 tabular-nums">
                  <span>1200</span><span>3500</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Protein', field: 'proteinGrams' },
                  { label: 'Carbs',   field: 'carbsGrams'   },
                  { label: 'Fat',     field: 'fatGrams'     },
                ].map(({ label, field }) => (
                  <div key={field} className="text-center">
                    <label className="block font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-1">{label}</label>
                    <input
                      type="number"
                      value={preferences.macroPreferences[field]}
                      onChange={e => setMacro(field, e.target.value)}
                      className="w-full bg-cream border border-forest/20 rounded-md px-2 py-2 font-serif text-lg text-center text-forest tabular-nums focus:border-forest outline-none"
                    />
                    <span className="font-mono text-[9px] text-ink-muted">grams</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-7 anim-fade">
            <SectionHeader num="V" title="Recipe Style" subtitle="Cook time, complexity & budget" />

            {/* Cook time */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— Max Cook Time —</p>
              <div className="flex flex-wrap gap-2">
                {cookTimeOptions.map(({ label, value }) => (
                  <Pill
                    key={label}
                    active={preferences.recipeStyle.cookTime === value}
                    onClick={() => setStyle('cookTime', value)}
                  >
                    {label}
                  </Pill>
                ))}
              </div>
            </div>

            {/* Complexity */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— Complexity —</p>
              <div className="grid grid-cols-2 gap-2">
                {complexityOptions.map(({ value, label, desc }) => {
                  const active = preferences.recipeStyle.complexity === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStyle('complexity', value)}
                      className={`py-3 px-3 rounded-lg border-2 text-left transition-all
                        ${active
                          ? 'bg-forest text-cream border-forest shadow-[2px_2px_0_var(--terracotta)]'
                          : 'bg-cream text-forest border-forest/20 hover:border-forest/50'}`}
                    >
                      <div className="font-serif text-base leading-tight">{label}</div>
                      <div className={`font-mono text-[9px] uppercase tracking-wide mt-0.5 ${active ? 'text-cream/70' : 'text-ink-muted'}`}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Max ingredients */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— Max Ingredients —</p>
              <div className="flex flex-wrap gap-2">
                {ingredientOptions.map(({ label, value }) => (
                  <Pill
                    key={label}
                    active={preferences.recipeStyle.maxIngredients === value}
                    onClick={() => setStyle('maxIngredients', value)}
                  >
                    {label}
                  </Pill>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— Budget —</p>
              <div className="grid grid-cols-2 gap-2">
                {budgetOptions.map(({ value, label, desc }) => {
                  const active = preferences.recipeStyle.budgetLevel === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStyle('budgetLevel', value)}
                      className={`py-3 px-3 rounded-lg border-2 text-left transition-all
                        ${active
                          ? 'bg-forest text-cream border-forest shadow-[2px_2px_0_var(--terracotta)]'
                          : 'bg-cream text-forest border-forest/20 hover:border-forest/50'}`}
                    >
                      <div className="font-serif text-base leading-tight">{label}</div>
                      <div className={`font-mono text-[9px] uppercase tracking-wide mt-0.5 ${active ? 'text-cream/70' : 'text-ink-muted'}`}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Occasion */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta mb-2">— Occasion —</p>
              <div className="flex flex-wrap gap-2">
                {occasionOptions.map(({ label, value }) => (
                  <Pill
                    key={value}
                    active={preferences.recipeStyle.occasion === value}
                    onClick={() => setStyle('occasion', value)}
                  >
                    {label}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-paper bg-cream-warm">
        {step < 5 ? (
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 border-2 border-forest text-forest font-mono uppercase tracking-editorial text-xs hover:bg-forest hover:text-cream transition-all"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="flex-1 btn-forest py-3 font-mono uppercase tracking-editorial text-xs"
            >
              Next →
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 py-3 border-2 border-forest text-forest font-mono uppercase tracking-editorial text-xs hover:bg-forest hover:text-cream transition-all"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 btn-terracotta py-3 font-mono uppercase tracking-editorial text-xs disabled:opacity-60"
            >
              {loading ? 'Composing…' : 'Compose Plan ✦'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
