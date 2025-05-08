import React from 'react';

const LoadingIndicator = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2">Lädt...</span>
    </div>
  );
};

export default LoadingIndicator;
