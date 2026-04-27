import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MealImage({ mealName, searchTerm, imageCache, setImageCache, size = 'sm' }) {
  const cacheKey = searchTerm || mealName;
  const cached = imageCache?.[cacheKey];
  const [imageUrl, setImageUrl] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [loaded, setLoaded] = useState(!!cached);

  useEffect(() => {
    if (cached) return;
    const fetchImage = async () => {
      try {
        const response = await fetch(`${API}/api/meal-plan/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mealDescription: cacheKey }),
        });
        const data = await response.json();
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          setImageCache(prev => ({ ...prev, [cacheKey]: data.imageUrl }));
        }
      } catch (err) {
        console.error('Failed to generate meal image:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchImage();
  }, [cacheKey]);

  const sizeClass = size === 'lg' ? 'w-full h-44' : 'w-20 h-20';

  // Polaroid-style frame: white/cream border, subtle tilt, paper grain, offset shadow
  const frame = `${sizeClass} flex-shrink-0 bg-cream-warm p-1.5 border border-paper shadow-[2px_3px_0_rgba(15,78,59,0.12)] paper-grain relative overflow-hidden`;

  if (loading) {
    return (
      <div className={frame}>
        <div className="w-full h-full bg-paper/60 flex items-center justify-center">
          <span className="font-serif italic text-forest/40 text-xl">…</span>
        </div>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className={frame}>
        {!loaded && <div className="absolute inset-1.5 bg-paper/60" />}
        <img
          src={imageUrl}
          alt={mealName}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-0 pointer-events-none paper-grain opacity-40 mix-blend-multiply" />
      </div>
    );
  }

  return (
    <div className={frame}>
      <div className="w-full h-full bg-forest/10 flex items-center justify-center">
        <span className="font-serif italic text-forest text-2xl">M</span>
      </div>
    </div>
  );
}
