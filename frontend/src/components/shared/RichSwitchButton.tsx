import React from 'react';

interface RichSwitchButtonProps {
  /** The current checked state */
  checked: boolean;
  /** Callback when the state changes */
  onChange: (checked: boolean) => void;
  /** Optional ID for accessibility */
  id?: string;
  /** Optional container class overrides */
  className?: string;
}

/**
 * RichSwitchButton
 * 
 * A GitHub Primer-style toggle switch with "On/Off" labels 
 * and inline SVG icons (Line/Circle) for better accessibility.
 */
export const RichSwitchButton: React.FC<RichSwitchButtonProps> = ({ 
  checked, 
  onChange, 
  id, 
  className = "" 
}) => {
  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer ${className}`}
      onClick={() => onChange(!checked)}
    >
      <span className="text-sm font-medium text-[var(--text-secondary)] select-none w-[22px] text-right">
        {checked ? "On" : "Off"}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-pressed={checked}
        aria-disabled="false"
        data-checked={checked}
        data-disabled="false"
        onClick={(e) => {
          // Prevent double firing if clicking directly on the button since the wrapper also has onClick
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-[32px] w-[60px] shrink-0 items-center rounded-md transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-link)] focus-visible:ring-offset-2 border ${
          checked 
            ? "bg-[var(--accent-link)] border-transparent" 
            : "bg-[var(--surface-subtle)] border-[var(--border-default)]"
        }`}
      >
        {/* SwitchButtonContent */}
        <div aria-hidden="true" className="absolute inset-0 flex justify-between items-center pointer-events-none" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
          {/* LineIconContainer */}
          <div data-checked={checked} data-disabled="false" className={`transition-opacity duration-200 flex items-center justify-center ${checked ? "opacity-100 text-white" : "opacity-0"}`}>
             <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
               <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v11.5a.75.75 0 0 1-1.5 0V2.75A.75.75 0 0 1 8 2Z"></path>
             </svg>
          </div>
          {/* CircleIconContainer */}
          <div data-checked={checked} data-disabled="false" className={`transition-opacity duration-200 flex items-center justify-center ${checked ? "opacity-0" : "opacity-100 text-[var(--text-secondary)]"}`}>
             <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
               <path fillRule="evenodd" d="M8 12.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12Z"></path>
             </svg>
          </div>
        </div>

        {/* ToggleKnob */}
        <div
          data-checked={checked}
          data-disabled="false"
          aria-hidden="true"
          className={`pointer-events-none inline-block h-[28px] w-[28px] transform rounded bg-white transition duration-200 ease-in-out relative z-10 ${
            checked 
              ? "translate-x-[29px] shadow-sm border border-transparent" 
              : "translate-x-[1px] shadow-sm border border-[var(--border-default)]"
          }`}
        ></div>
      </button>
    </div>
  );
};
