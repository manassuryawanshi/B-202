import React from 'react';

/**
 * Official Google Material Icon Component
 * Supports both Google Material Symbols webfont and fallback Google Material SVG paths.
 */
export default function MaterialIcon({
  name,
  size = 20,
  color = 'currentColor',
  filled = false,
  weight = 500,
  className = '',
  style = {}
}) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      aria-hidden="true"
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        lineHeight: 1,
        color: color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        verticalAlign: 'middle',
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        flexShrink: 0,
        ...style
      }}
    >
      {name}
    </span>
  );
}
