import React from 'react';

interface TwinButtonGroupProps {
  /** The two button elements to render side-by-side */
  children: React.ReactNode;
  /** Optional container class overrides */
  className?: string;
}

/**
 * TwinButtonGroup
 * 
 * A reusable wrapper component that seamlessly joins two button elements together.
 * It automatically removes the right border-radius of the first child, removes the 
 * left border-radius of the second child, and merges their inner borders perfectly 
 * to prevent double thickness.
 */
export const TwinButtonGroup: React.FC<TwinButtonGroupProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div 
      className={`isolate inline-flex shadow-sm rounded-md ${className}
        [&>*:first-child]:rounded-r-none [&>*:first-child]:rounded-l-md
        [&>*:last-child]:rounded-l-none [&>*:last-child]:rounded-r-md
        [&>*:not(:first-child)]:-ml-px 
        [&>*:hover]:z-10 [&>*:focus]:z-10
      `}
    >
      {children}
    </div>
  );
};
