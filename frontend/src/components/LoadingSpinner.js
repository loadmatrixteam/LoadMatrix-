import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '', text = '' }) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-4 border-primary-200 border-t-primary-500 ${sizeClasses[size]} touch-manipulation`}></div>
      {text && (
        <p className="mt-2 text-sm text-neutral-600 animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;