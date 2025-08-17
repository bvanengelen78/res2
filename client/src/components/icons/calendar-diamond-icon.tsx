import React from 'react';

interface CalendarDiamondIconProps {
  className?: string;
  size?: number;
}

export const CalendarDiamondIcon: React.FC<CalendarDiamondIconProps> = ({
  className = "",
  size = 24
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Calendar base structure */}
      <g>
        {/* Calendar rings/binding at top */}
        <rect x="28" y="12" width="5" height="18" rx="2.5" fill="currentColor" opacity="0.9"/>
        <rect x="40" y="8" width="5" height="22" rx="2.5" fill="currentColor" opacity="0.9"/>
        <rect x="52" y="12" width="5" height="18" rx="2.5" fill="currentColor" opacity="0.9"/>
        <rect x="64" y="8" width="5" height="22" rx="2.5" fill="currentColor" opacity="0.9"/>

        {/* Calendar body */}
        <rect
          x="18"
          y="25"
          width="64"
          height="55"
          rx="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
        />

        {/* Calendar top line */}
        <line
          x1="18"
          y1="38"
          x2="82"
          y2="38"
          stroke="currentColor"
          strokeWidth="2.5"
        />

        {/* Calendar grid - more structured layout */}
        <rect x="25" y="45" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="37" y="45" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="49" y="45" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="61" y="45" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>

        <rect x="25" y="55" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="37" y="55" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="49" y="55" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="61" y="55" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>

        <rect x="25" y="65" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="37" y="65" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="49" y="65" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="61" y="65" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
      </g>

      {/* Red diamond overlay - positioned like in the original image */}
      <g>
        <rect
          x="58"
          y="58"
          width="18"
          height="18"
          rx="1"
          fill="#EF4444"
          transform="rotate(45 67 67)"
          style={{
            filter: 'drop-shadow(0 2px 6px rgba(239, 68, 68, 0.3))'
          }}
        />
      </g>
    </svg>
  );
};

export default CalendarDiamondIcon;
