import React from 'react';

interface PanoptextEyeLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

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
      {/* Outer eye contour */}
      <path
        d="M2 12C4.5 7 8 4.5 12 4.5C16 4.5 19.5 7 22 12C19.5 17 16 19.5 12 19.5C8 19.5 4.5 17 2 12Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Outer iris circle */}
      <circle
        cx="12"
        cy="12"
        r="4.5"
        stroke={color}
        strokeWidth="1.8"
      />
      {/* Inner pupil */}
      <circle
        cx="12"
        cy="12"
        r="2.5"
        fill={color}
      />
      {/* Catchlight sparkle */}
      <circle
        cx="13.3"
        cy="10.7"
        r="0.8"
        fill="#FFFFFF"
      />
    </svg>
  );
};
