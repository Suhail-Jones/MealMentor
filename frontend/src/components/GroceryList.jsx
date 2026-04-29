import { useState, useRef } from 'react';

const STORE_STYLES = {
  walmart: { tint: 'border-forest/30 text-forest',   label: 'Walmart' },
  kroger:  { tint: 'border-terracotta/40 text-terracotta', label: 'Kroger' },
};

const CATEGORY_META = {
  produce: '🥦', dairy: '🥛', meat: '🥩', seafood: '🐟',
  grains: '🌾', canned: '🥫', spices: '🧂', frozen: '🧊', other: '🛒',
};

function StorePriceLink({ entry, storeKey }) {
  const style = STORE_STYLES[storeKey];
  if (!entry) return null;

  const perOzLabel = entry.pricePerOz ? `$${entry.pricePerOz.toFixed(2)}/oz` : null;
  const sizeLabel = entry.unitSize ?? null;

  const content = entry.price ? (
    <div className="flex flex-col items-start leading-tight">
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-sm tabular-nums">{entry.price}</span>
        <span className="font-mono text-[9px] uppercase tracking-editorial opacity-70">{style.label}</span>
        {entry.estimated && (
          <span
            title="Estimated price — store search lookup didn't find an exact match. AI estimate based on typical 2025 US prices."
            className="font-mono text-[8px] uppercase tracking-editorial bg-ink-muted/15 text-ink-muted px-1 py-px rounded-sm"
          >
            est.
          </span>
        )}
      </div>
      {(sizeLabel || perOzLabel) && (
        <span className="font-mono text-[9px] opacity-60 mt-0.5 tabular-nums">
          {sizeLabel}{sizeLabel && perOzLabel ? ' · ' : ''}{perOzLabel}
        </span>
      )}
    </div>
  ) : (
    <span className="font-mono text-[9px] uppercase tracking-editorial opacity-70">{style.label} →</span>
  );

  const baseBorder = entry.estimated ? 'border-dashed' : '';
  const base = `inline-flex items-center bg-cream border ${baseBorder} px-2.5 py-1.5 transition-all ${style.tint}`;

  if (entry.url) {
    return (
      <a href={entry.url} target="_blank" rel="noopener noreferrer"
        className={`${base} hover:shadow-[2px_2px_0_rgba(15,78,59,0.15)] hover:-translate-y-0.5`}>
        {content}
      </a>
    );
  }
  return <span className={base}>{content}</span>;
}

function parsePrice(str) {
  const n = parseFloat((str || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function computeStoreTotals(shoppingItems, priceData) {
  if (!priceData || Object.keys(priceData).length === 0) return null;
  let wT = 0, kT = 0, wC = 0, kC = 0;
  for (const cat of shoppingItems) {
    for (const item of cat.items) {
      const e = priceData[item.name];
      const w = parsePrice(e?.walmart?.price);
      const k = parsePrice(e?.kroger?.price);
      if (w !== null) { wT += w; wC++; }
      if (k !== null) { kT += k; kC++; }
    }
  }
  return {
    walmart: wC > 0 ? `$${wT.toFixed(2)}` : null,
    kroger:  kC > 0 ? `$${kT.toFixed(2)}` : null,
  };
}

const UNDO_TIMEOUT_MS = 5000;

export default function GroceryList({
  shoppingItems, setShoppingItems,
  checkedItems, setCheckedItems,
  onClearAll,
  priceData, priceLoading, priceError,
  onComparePrices,
}) {
  const [undoPending, setUndoPending] = useState(null);
  const timerRef = useRef(null);

  const toggleItemCheck = (itemKey) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemKey)) next.delete(itemKey); else next.add(itemKey);
      return next;
    });
  };

  const removeItem = (catIdx, itemIdx) => {
    const item     = shoppingItems[catIdx].items[itemIdx];
    const catName  = shoppingItems[catIdx].category;

    if (timerRef.current) clearTimeout(timerRef.current);

    setShoppingItems(prev => prev
      .map((cat, ci) => ci !== catIdx ? cat : { ...cat, items: cat.items.filter((_, ii) => ii !== itemIdx) })
      .filter(cat => cat.items.length > 0));

    const timerId = setTimeout(() => setUndoPending(null), UNDO_TIMEOUT_MS);
    timerRef.current = timerId;
    setUndoPending({ item, catName, atItemIdx: itemIdx });
  };

  const handleUndo = () => {
    if (!undoPending) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const { item, catName, atItemIdx } = undoPending;
    setShoppingItems(prev => {
      const updated = prev.map(cat => ({ ...cat, items: [...cat.items] }));
      const cat = updated.find(c => c.category === catName);
      if (cat) {
        cat.items.splice(Math.min(atItemIdx, cat.items.length), 0, item);
      } else {
        updated.push({ category: catName, items: [item] });
      }
      return updated;
    });
    setUndoPending(null);
  };

  const updateQuantity = (catIdx, itemIdx, value) => {
    setShoppingItems(prev =>
      prev.map((cat, ci) =>
        ci !== catIdx ? cat : {
          ...cat,
          items: cat.items.map((item, ii) => ii !== itemIdx ? item : { ...item, totalQuantity: value })
        }
      )
    );
  };

  if (!shoppingItems || shoppingItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center anim-fade py-20">
        <div className="w-20 h-20 rounded-full border-2 border-forest flex items-center justify-center text-4xl bg-cream-warm anim-float">
          🛒
        </div>
        <h3 className="font-serif text-2xl text-forest italic">The market waits</h3>
        <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-muted max-w-xs">
          Reveal a recipe · send to market
        </p>
        <div className="squiggle-line w-32 mt-2" />
      </div>
    );
  }

  const totalItems = shoppingItems.reduce((n, c) => n + c.items.length, 0);
  const checkedCount = checkedItems.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
  const storeTotals = computeStoreTotals(shoppingItems, priceData);

  return (
    <div className="p-5 pb-6 anim-fade">
      {/* Progress ledger */}
      <div className="bg-cream-warm border border-paper paper-grain p-4 mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-editorial text-terracotta">— Progress —</p>
            <p className="font-serif text-2xl text-forest leading-tight tabular-nums">
              {checkedCount} <span className="font-serif italic text-ink-muted text-lg">of {totalItems}</span>
            </p>
          </div>
          <button
            onClick={onClearAll}
            className="px-3 py-1.5 border-2 border-rust text-rust font-mono uppercase tracking-editorial text-[10px] hover:bg-rust hover:text-cream transition-all"
          >
            Clear all
          </button>
        </div>
        <div className="h-[3px] bg-forest/15 overflow-hidden">
          <div className="h-full bg-forest transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Compare button */}
      <div className="mb-4">
        <button
          onClick={onComparePrices}
          disabled={priceLoading}
          className="w-full btn-terracotta py-3 font-mono uppercase tracking-editorial text-xs disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {priceLoading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-cream border-t-transparent rounded-full animate-spin" />
              Sourcing prices…
            </>
          ) : (
            <>✦ Compare at Local Stores</>
          )}
        </button>
        {priceError && (
          <p className="font-mono text-[10px] text-rust mt-2 text-center">{priceError}</p>
        )}
      </div>

      {/* Store totals */}
      {storeTotals && (
        <div className="mb-5 anim-fade-up">
          <p className="font-mono text-[9px] text-ink-muted text-center mb-2 italic">
            Estimates only · items marked <span className="not-italic">est.</span> are AI-priced when stores lack the item
          </p>
          <div className="grid grid-cols-2 gap-3">
            <a href="https://www.walmart.com/grocery" target="_blank" rel="noopener noreferrer"
              className="bg-cream-warm border border-forest/30 p-3 text-center paper-grain hover:shadow-[3px_3px_0_var(--forest)] hover:-translate-y-0.5 transition-all">
              <p className="font-mono text-[9px] uppercase tracking-editorial text-terracotta">Walmart</p>
              <p className="font-serif text-2xl italic text-forest tabular-nums my-1">{storeTotals.walmart ?? '—'}</p>
              <p className="font-mono text-[9px] uppercase tracking-editorial text-ink-muted">shop →</p>
            </a>
            <a href="https://www.kroger.com" target="_blank" rel="noopener noreferrer"
              className="bg-cream-warm border border-terracotta/40 p-3 text-center paper-grain hover:shadow-[3px_3px_0_var(--terracotta)] hover:-translate-y-0.5 transition-all">
              <p className="font-mono text-[9px] uppercase tracking-editorial text-terracotta">Kroger</p>
              <p className="font-serif text-2xl italic text-forest tabular-nums my-1">{storeTotals.kroger ?? '—'}</p>
              <p className="font-mono text-[9px] uppercase tracking-editorial text-ink-muted">shop →</p>
            </a>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {undoPending && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col bg-[var(--ink)] text-[var(--cream)] shadow-[3px_3px_0_var(--terracotta)] anim-fade-up overflow-hidden"
          style={{ maxWidth: 'calc(100vw - 2.5rem)' }}>
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-editorial truncate">
              Removed <span className="text-[var(--terracotta)]">{undoPending.item.name}</span>
            </span>
            <button
              onClick={handleUndo}
              className="flex-shrink-0 font-mono text-[10px] uppercase tracking-editorial border border-[var(--terracotta)] text-[var(--terracotta)] px-2.5 py-1 hover:bg-[var(--terracotta)] hover:text-[var(--cream)] transition-all"
            >
              Undo
            </button>
          </div>
          <div
            className="h-[3px] bg-[var(--terracotta)] origin-left"
            style={{ animation: `undoShrink ${UNDO_TIMEOUT_MS}ms linear forwards` }}
          />
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {shoppingItems.map((category, catIdx) => {
          const icon = CATEGORY_META[category.category?.toLowerCase()] ?? CATEGORY_META.other;
          return (
            <div key={catIdx} className="anim-fade-up bg-cream-warm border border-paper paper-grain">
              <div className="flex justify-between items-center px-4 py-2.5 border-b border-paper">
                <div className="flex items-baseline gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="font-serif text-base text-forest italic capitalize">{category.category}</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-editorial text-ink-muted tabular-nums">
                  {category.items.length} item{category.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="px-3 py-2 divide-y divide-paper/60">
                {category.items.map((item, itemIdx) => {
                  const key = `${category.category}-${itemIdx}`;
                  const checked = checkedItems.has(key);
                  const priceEntry = priceData?.[item.name];

                  return (
                    <div key={itemIdx} className="py-2">
                      <div className="flex items-center gap-2">
                        <label className="relative flex-shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItemCheck(key)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 border-2 transition-all flex items-center justify-center
                            ${checked ? 'bg-forest border-forest' : 'bg-cream border-forest/40 hover:border-forest'}`}>
                            {checked && <span className="text-cream text-xs font-serif italic leading-none">✓</span>}
                          </div>
                        </label>
                        <span className={`flex-1 font-serif text-[15px] transition-all
                          ${checked ? 'line-through text-ink-muted italic' : 'text-ink'}`}>
                          {item.name}
                        </span>
                        <input
                          type="number"
                          value={item.totalQuantity}
                          onChange={e => updateQuantity(catIdx, itemIdx, e.target.value)}
                          className="w-14 font-mono text-xs tabular-nums bg-cream border border-forest/20 px-1.5 py-1 text-center focus:border-forest outline-none"
                          min="0" step="any"
                        />
                        <span className="font-mono text-[10px] text-ink-muted w-8">{item.unit}</span>
                        <button
                          onClick={() => removeItem(catIdx, itemIdx)}
                          className="text-ink-muted hover:text-rust text-lg leading-none w-6 h-6 flex items-center justify-center transition"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                      {priceEntry && (
                        <div className="flex gap-2 ml-7 mt-2 flex-wrap anim-fade">
                          <StorePriceLink entry={priceEntry.walmart} storeKey="walmart" />
                          <StorePriceLink entry={priceEntry.kroger}  storeKey="kroger"  />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
