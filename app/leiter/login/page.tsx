import React from 'react';
import LoginForm from './LoginForm'; // Import the new client component

export default function LeiterLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
      <React.Suspense fallback={<div>Loading...</div>}> {/* Wrap with Suspense */}
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
