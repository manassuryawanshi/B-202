import React from 'react';
import MaterialIcon from './MaterialIcon';

export const REACTION_TYPES = [
  { id: 'like', label: 'Like', icon: 'like', color: '#34C759', bg: 'rgba(52, 199, 89, 0.14)' },
  { id: 'dislike', label: 'Dislike', icon: 'dislike', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.14)' },
  { id: 'loved', label: 'Love', icon: 'loved', color: '#FF2D78', bg: 'rgba(255, 45, 120, 0.14)' }
];

export function ReactionIcon({ type, size = 15 }) {
  switch (type) {
    case 'like':
      return <MaterialIcon name="thumb_up" size={size} color="#34C759" filled />;
    case 'dislike':
      return <MaterialIcon name="thumb_down" size={size} color="#FF3B30" filled />;
    case 'loved':
      return <MaterialIcon name="favorite" size={size} color="#FF2D78" filled />;
    default:
      return <MaterialIcon name="thumb_up" size={size} color="#34C759" filled />;
  }
}
