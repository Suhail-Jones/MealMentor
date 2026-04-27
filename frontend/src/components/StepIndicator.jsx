const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export default function StepIndicator({ current, total }) {
  return (
    <div className="mb-6 anim-fade">
      <div className="flex items-center gap-2 mb-2">
        {Array.from({ length: total }, (_, i) => {
          const done   = i + 1 < current;
          const active = i + 1 === current;
          return (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all flex-shrink-0
                ${active ? 'border-forest bg-cream scale-110 shadow-[2px_2px_0_var(--forest)]' :
                  done   ? 'border-forest bg-forest text-cream' :
                           'border-ink-muted/30 bg-transparent text-ink-muted'}`}
              >
                <span className={`font-serif italic text-sm leading-none
                  ${active ? 'text-forest' : done ? 'text-cream' : 'text-ink-muted'}`}>
                  {done ? '✓' : ROMAN[i]}
                </span>
              </div>
              {i < total - 1 && (
                <div className="flex-1 h-px bg-forest/20 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-forest transition-all duration-500"
                    style={{ width: done ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className="font-mono text-[10px] uppercase tracking-editorial text-terracotta">
          Chapter {ROMAN[current - 1]} of {ROMAN[total - 1]}
        </span>
        <span className="font-mono text-[10px] tracking-editorial text-ink-muted tabular-nums">
          p.{String(current * 3).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
