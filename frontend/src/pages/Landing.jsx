export default function Landing({ onStart }) {
  const features = [
    { num: 'I',   title: 'Grown from Prompt',    desc: 'Our AI translates your taste, macros, and mood into a full plan.' },
    { num: 'II',  title: 'Calibrated Nutrition', desc: 'Hit your protein, carbs, and calorie marks — no guesswork.' },
    { num: 'III', title: 'Compare, Then Cart',   desc: 'Side-by-side prices across Walmart and Kroger, per ounce.' },
    { num: 'IV',  title: 'Any Diet, Any Soil',   desc: 'Vegan, keto, pescatarian, allergen-aware — we adapt.' },
  ];

  const wordmark = 'MealMentor'.split('');

  const floatingIcons = [
    { char: '🌿', top: '12px',  left: '12px',  delay: '0s',   size: 'text-3xl' },
    { char: '🥬', top: '90px',  right: '14px', delay: '1.2s', size: 'text-2xl' },
    { char: '🫒', top: '220px', left: '10px',  delay: '0.6s', size: 'text-2xl' },
    { char: '🧄', top: '340px', right: '12px', delay: '1.8s', size: 'text-2xl' },
    { char: '🌾', top: '480px', left: '14px',  delay: '0.3s', size: 'text-3xl' },
    { char: '🍋', top: '580px', right: '16px', delay: '1.5s', size: 'text-2xl' },
  ];

  return (
    <div className="bg-paper paper-grain relative overflow-hidden">


      {/* Horizontal vine draped across top */}
      <svg className="w-full anim-fade" style={{ animationDelay: '0.2s', height: '72px', display: 'block' }} viewBox="0 0 400 72" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main branch */}
        <path d="M -10 28 Q 40 18 80 30 Q 120 42 160 26 Q 200 12 240 28 Q 280 44 320 24 Q 360 8 410 22" stroke="var(--forest)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7"/>
        {/* Tendrils hanging down */}
        <path d="M 30 26 Q 28 38 32 50" stroke="var(--forest)" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        <path d="M 95 36 Q 92 50 88 62" stroke="var(--forest)" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        <path d="M 200 16 Q 198 30 202 44" stroke="var(--forest)" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        <path d="M 310 28 Q 308 42 312 56" stroke="var(--forest)" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        <path d="M 370 14 Q 374 26 370 40" stroke="var(--forest)" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        {/* Leaves */}
        <ellipse cx="28" cy="20" rx="8" ry="4" transform="rotate(-30 28 20)" fill="var(--forest)" opacity="0.35"/>
        <ellipse cx="70" cy="32" rx="7" ry="3.5" transform="rotate(20 70 32)" fill="var(--forest)" opacity="0.30"/>
        <ellipse cx="115" cy="22" rx="8" ry="4" transform="rotate(-20 115 22)" fill="var(--forest)" opacity="0.35"/>
        <ellipse cx="160" cy="34" rx="7" ry="3" transform="rotate(30 160 34)" fill="var(--forest)" opacity="0.28"/>
        <ellipse cx="200" cy="14" rx="9" ry="4" transform="rotate(-15 200 14)" fill="var(--forest)" opacity="0.35"/>
        <ellipse cx="245" cy="30" rx="7" ry="3.5" transform="rotate(25 245 30)" fill="var(--forest)" opacity="0.30"/>
        <ellipse cx="290" cy="20" rx="8" ry="4" transform="rotate(-25 290 20)" fill="var(--forest)" opacity="0.32"/>
        <ellipse cx="335" cy="28" rx="7" ry="3" transform="rotate(15 335 28)" fill="var(--forest)" opacity="0.28"/>
        <ellipse cx="375" cy="12" rx="8" ry="4" transform="rotate(-20 375 12)" fill="var(--forest)" opacity="0.35"/>
        {/* Small berries/dots */}
        <circle cx="52" cy="38" r="2.5" fill="var(--terracotta)" opacity="0.4"/>
        <circle cx="148" cy="28" r="2" fill="var(--terracotta)" opacity="0.35"/>
        <circle cx="270" cy="36" r="2.5" fill="var(--terracotta)" opacity="0.4"/>
        <circle cx="355" cy="22" r="2" fill="var(--terracotta)" opacity="0.35"/>
      </svg>

      <div className="relative z-10 px-6 pt-0 pb-10 max-w-md mx-auto flex flex-col">

        {/* Masthead */}
        <div className="landing-masthead flex items-center gap-3 text-[10px] font-mono uppercase tracking-editorial text-forest anim-fade pt-3" style={{ animationDelay: '0.1s' }}>
          <div className="h-px flex-1 bg-forest/40" />
          <span>Est · MMXXVI · Vol I</span>
          <div className="h-px flex-1 bg-forest/40" />
        </div>

        {/* Icon row */}
        <div className="flex items-center justify-center gap-5 py-3 pointer-events-none select-none">
          {floatingIcons.map((f, i) => (
            <span key={i} className={`${f.size} opacity-50 anim-float`} style={{ animationDelay: f.delay }}>
              {f.char}
            </span>
          ))}
        </div>

        {/* Hero */}
        <div className="landing-hero flex flex-col pt-3 pb-2">

          {/* Circular stamp */}
          <div className="landing-stamp relative mb-4 self-start anim-stamp" style={{ animationDelay: '0.3s' }}>
            <div className="relative w-24 h-24">
              <svg className="absolute inset-0 w-full h-full anim-rotate-seal" viewBox="0 0 100 100">
                <defs>
                  <path id="circle-path" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
                </defs>
                <text className="font-mono" fontSize="12" fill="var(--forest)" letterSpacing="1.5">
                  <textPath href="#circle-path" textLength="238" lengthAdjust="spacing" xmlSpace="preserve">AI KITCHEN     ·     PERFECTLY SEASONED     ·     ALWAYS TASTY     ·     </textPath>
                </text>
              </svg>
              <div className="absolute inset-4 rounded-full border-2 border-forest flex items-center justify-center bg-cream">
                <div className="absolute inset-1 rounded-full border border-forest/30" />
                <span className="font-serif text-3xl italic text-forest leading-none">M</span>
              </div>
            </div>
          </div>

          {/* Wordmark */}
          <h1 className="landing-wordmark font-serif text-[56px] leading-[0.88] text-forest mb-1 tracking-tight-hero whitespace-nowrap">
            {wordmark.map((ch, i) => (
              <span
                key={i}
                className="inline-block anim-letter"
                style={{
                  animationDelay: `${0.55 + i * 0.04}s`,
                  fontStyle: i === 4 ? 'italic' : 'normal',
                  fontVariationSettings: i === 4 ? "'opsz' 144, 'SOFT' 100, 'WONK' 1" : "'opsz' 144, 'SOFT' 50",
                }}
              >
                {ch}
              </span>
            ))}
          </h1>

          {/* Hand-drawn squiggle */}
          <svg className="w-56 h-3 mb-3 mt-1" viewBox="0 0 240 12" fill="none">
            <path
              className="draw-path"
              d="M 2 6 Q 20 1 40 6 T 80 6 T 120 6 T 160 6 T 200 6 T 238 6"
              stroke="var(--terracotta)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              style={{ animationDelay: '1.1s' }}
            />
          </svg>

          {/* Subtitle */}
          <p className="landing-subtitle font-serif text-xl text-ink-soft leading-snug italic anim-fade-up max-w-sm" style={{ animationDelay: '1.3s' }}>
            A small, thoughtful journal for meal planning —<br/>
            <span className="not-italic font-sans text-base text-ink-muted">
              written by AI, seasoned by you.
            </span>
          </p>
        </div>

        {/* Table of contents (features) */}
        <div className="landing-features mb-3">
          <div className="flex items-center gap-3 mb-3 anim-fade" style={{ animationDelay: '1.5s' }}>
            <span className="font-mono text-[10px] uppercase tracking-editorial text-terracotta">— Contents —</span>
            <div className="h-px flex-1 bg-forest/30" />
          </div>

          <div className="space-y-3">
            {features.map((f, i) => (
              <div
                key={i}
                className={`flex items-baseline gap-4 ${i % 2 === 0 ? 'anim-right' : 'anim-left'}`}
                style={{ animationDelay: `${1.7 + i * 0.14}s` }}
              >
                <span className="font-serif text-xl italic text-terracotta flex-shrink-0 w-7">{f.num}.</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg text-forest leading-tight font-semibold">{f.title}</h3>
                  <p className="text-sm text-ink-muted leading-snug mt-0.5">{f.desc}</p>
                </div>
                <div className="font-mono text-[10px] text-ink-muted tabular-nums">p.{String((i+1) * 7).padStart(2, '0')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="anim-fade-up pb-2" style={{ animationDelay: '2.35s' }}>
          <button
            onClick={onStart}
            className="w-full btn-forest py-4 font-mono uppercase tracking-editorial text-sm flex items-center justify-center gap-3"
          >
            <span>Begin the Plan</span>
            <span className="text-lg leading-none">→</span>
          </button>

          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-editorial text-ink-muted">
            <span>Kitchen</span>
            <span className="text-terracotta">✦</span>
            <span>AI</span>
            <span className="text-terracotta">✦</span>
            <span>Nutrition</span>
          </div>
        </div>

      </div>
    </div>
  );
}
