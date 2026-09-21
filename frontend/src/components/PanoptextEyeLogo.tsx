import React from 'react';

interface PanoptextEyeLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Minimal Panoptext Eye Logo:
 * Exactly two geometric objects:
 * 1. Eye frame (outer contour)
 * 2. Circle inside (pupil/iris)
 */
export const PanoptextEyeLogo: React.FC<PanoptextEyeLogoProps> = ({
  size = 22,
  className = '',
  color = '#0D5EAF'
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 1. Eye frame */}
      <path
        d="M2 12C4.5 6.5 8 4 12 4C16 4 19.5 6.5 22 12C19.5 17.5 16 20 12 20C8 20 4.5 17.5 2 12Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 2. Circle inside */}
      <circle
        cx="12"
        cy="12"
        r="3.5"
        fill={color}
      />
    </svg>
  );
};
