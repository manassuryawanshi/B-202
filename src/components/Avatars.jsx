import React from 'react';

// Flatmate color palette for silhouette differentiation
const MEMBER_COLORS = {
  manas: '#007AFF',      // Apple Royal Blue
  rohan: '#FF9500',      // Apple Vibrant Orange
  shubham: '#FF2D55',    // Apple Rose / Coral
  ujwal: '#34C759',      // Apple Emerald Green
  prathamesh: '#AF52DE', // Apple Purple / Violet
  owner: '#1C1C1E',      // Sleek Dark Charcoal / Black (As shown in user's image)
  default: '#1C1C1E'     // Empty / default black person profile (Exact user image)
};

export default function FlatmateAvatar({ id, customAvatar, size = 38, className = '' }) {
  const s = size;

  // 1. If user has uploaded custom personal picture
  if (customAvatar) {
    return (
      <img
        src={customAvatar}
        alt="Profile"
        className={className}
        style={{
          width: s,
          height: s,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1.5px solid var(--ios-card-border, #ECEEF2)'
        }}
      />
    );
  }

  // 2. Color differentiation based on flatmate; black for empty/default
  const bgColor = (id && MEMBER_COLORS[id.toLowerCase()]) || MEMBER_COLORS.default;

  // 3. Exact profile silhouette matching the user's reference image
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      className={className}
      style={{
        borderRadius: '50%',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
      }}
    >
      {/* Background colored/black circle */}
      <circle cx="50" cy="50" r="50" fill={bgColor} />

      {/* Crisp White Silhouette Geometry matching user's reference */}
      {/* Circular Head */}
      <circle cx="50" cy="37" r="14" fill="#FFFFFF" />

      {/* Semicircular / Dome Shoulder Arc */}
      <path
        d="M23 85 C23 62 35 53 50 53 C65 53 77 62 77 85 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
