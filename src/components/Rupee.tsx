import React from 'react';

interface RupeeProps {
  className?: string;
}

export const Rupee: React.FC<RupeeProps> = ({ className = 'w-3 h-3' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ verticalAlign: '-0.12em', display: 'inline-block' }}
    >
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="M6 13l8.5 8" />
      <path d="M6 13h3a4 4 0 0 0 0-8H6" />
    </svg>
  );
};
