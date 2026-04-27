export default function BottomNav({ activeTab, onTabChange, mealsReady }) {
  const tabs = [
    { id: 'generate', label: 'Kitchen', num: 'I'   },
    { id: 'meals',    label: 'Menu',    num: 'II'  },
    { id: 'shopping', label: 'Market',  num: 'III' },
  ];

  return (
    <nav className="flex-shrink-0 bg-cream-warm border-t border-paper relative">
      <div className="squiggle-line absolute top-0 left-0 right-0" />
      <div className="flex px-2 pt-3 pb-3">
        {tabs.map((tab) => {
          const locked = tab.id !== 'generate' && !mealsReady;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => !locked && onTabChange(tab.id)}
              disabled={locked}
              className={`flex-1 flex flex-col items-center gap-1 py-1 transition-all relative
                ${locked ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <span className={`font-mono text-[9px] tracking-editorial
                ${active ? 'text-terracotta' : 'text-ink-muted'}`}>
                № {tab.num}
              </span>
              <span className={`font-serif text-base leading-none transition-colors
                ${active ? 'text-forest italic' : 'text-ink-soft'}`}>
                {tab.label}
              </span>
              <div className={`h-[2px] mt-1 transition-all rounded-full
                ${active ? 'w-8 bg-terracotta' : 'w-0 bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
