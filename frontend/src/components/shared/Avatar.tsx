import React from 'react';

interface AvatarProps {
  /** The username, used for initials and aria-labels */
  username: string;
  /** Optional URL to the user's profile picture */
  src?: string;
  /** Size of the avatar in pixels. Default is 32 */
  size?: number;
  /** Additional classes to apply to the container */
  className?: string;
  /** If provided, renders as an interactive button */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Pass-through for accessibility */
  ariaExpanded?: boolean;
  /** If true, renders with a slight border radius instead of a full circle */
  square?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  username,
  src,
  size = 32,
  className = "",
  onClick,
  ariaExpanded,
  square = false,
}) => {
  const initial = (username.trim().charAt(0) || "U").toUpperCase();
  const radiusClass = square ? "rounded-md" : "rounded-full";
  
  // Calculate a font size based on the container size to keep initials proportionate
  const fontSize = Math.max(10, Math.floor(size * 0.45));

  const content = src ? (
    <img 
      src={src} 
      alt={`${username} avatar`} 
      className={`object-cover w-full h-full ${radiusClass}`}
    />
  ) : (
    <span 
      className="w-full h-full flex items-center justify-center shrink-0 font-semibold"
      style={{ fontSize: `${fontSize}px` }}
    >
      {initial}
    </span>
  );

  const containerClasses = `shrink-0 overflow-hidden inline-flex items-center justify-center border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] ${radiusClass} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${containerClasses} hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2`}
        style={{ width: size, height: size }}
        aria-label={`Open navigation menu for ${username}`}
        aria-haspopup="true"
        aria-expanded={ariaExpanded}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={containerClasses}
      style={{ width: size, height: size }}
      aria-label={`${username} avatar`}
    >
      {content}
    </div>
  );
};
