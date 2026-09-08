import React from 'react';
import MaterialIcon from './MaterialIcon';

// 1. Google Material Cleaning / Chores Icon ('cleaning_services' / 'brush')
export function BroomBrushIcon({ size = 20, color = 'currentColor', fill = 'none', className = '' }) {
  const isFilled = fill === 'currentColor' || fill === true;
  return (
    <MaterialIcon
      name="cleaning_services"
      size={size}
      color={color}
      filled={isFilled}
      className={className}
    />
  );
}

export const StandardCleaningIcon = BroomBrushIcon;
export const CleaningBroomBucketIcon = BroomBrushIcon;

// 2. Google Material Rupee Currency Icon ('currency_rupee')
export function RupeeBillIcon({ size = 20, color = 'currentColor', fill = 'none', className = '' }) {
  const isFilled = fill === 'currentColor' || fill === true;
  return (
    <MaterialIcon
      name="currency_rupee"
      size={size}
      color={color}
      filled={isFilled}
      className={className}
    />
  );
}

// 3. Google Material Laundry / Washing Machine Icon ('local_laundry_service')
export function WashingMachineIcon({ size = 20, color = 'currentColor', fill = 'none', className = '' }) {
  const isFilled = fill === 'currentColor' || fill === true;
  return (
    <MaterialIcon
      name="local_laundry_service"
      size={size}
      color={color}
      filled={isFilled}
      className={className}
    />
  );
}
