import React, { useState } from 'react';

// Shows a shimmer while loading and an emoji tile when the photo is missing or broken.
export default function ListingImage({ src, alt, emoji, className = '', fit = 'cover' }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <span className={`img-fallback ${className}`} role="img" aria-label={alt ? `${alt}: photo unavailable` : 'Photo unavailable'}>
        <span className="img-fallback-emoji" aria-hidden="true">{emoji || '📦'}</span>
        <span className="img-fallback-text" aria-hidden="true">{src ? 'Photo unavailable' : 'No photo yet'}</span>
      </span>
    );
  }

  return (
    <span className={`img-frame ${loadedSrc === src ? 'is-loaded' : 'is-loading'} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ objectFit: fit }}
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
      />
    </span>
  );
}
