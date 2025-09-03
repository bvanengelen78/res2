import React from 'react';
import { format } from 'date-fns';
// Authentication removed - public access

interface GreetingHeaderProps {
  className?: string;
}

/**
 * Personalized greeting header component
 * Displays time-based greeting with user's first name and current date
 * Derived from existing dashboard patterns in the codebase
 */
export const GreetingHeader: React.FC<GreetingHeaderProps> = ({ className = "" }) => {
  // Authentication removed - public access

  // Get user's first name for personalization - public access
  const getUserFirstName = () => {
    return 'Demo User';
  };

  // Get current time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = getUserFirstName();
  const greeting = getGreeting();
  const currentDate = format(new Date(), 'PPP'); // e.g., "August 23rd, 2025"

  return (
    <div className={`space-y-1 ${className}`}>
      <h2 className="text-2xl font-semibold text-foreground">
        {greeting}, <span className="font-bold">{firstName}!</span> 👋
      </h2>
      <p className="text-muted-foreground">
        {currentDate}
      </p>
    </div>
  );
};
