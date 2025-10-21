import React from 'react';

export const MessageSkeleton = () => {
  return (
    <div className="flex items-start gap-3 mb-4 animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
      
      {/* Message content skeleton */}
      <div className="flex-1 max-w-xl">
        {/* Username skeleton */}
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2"></div>
        
        {/* Message text skeleton */}
        <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl p-3 space-y-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        </div>
        
        {/* Timestamp skeleton */}
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16 mt-1"></div>
      </div>
    </div>
  );
};

export const RoomListSkeleton = () => {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const UserListSkeleton = () => {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2 p-2">
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
        </div>
      ))}
    </div>
  );
};

export const SearchResultSkeleton = () => {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default {
  MessageSkeleton,
  RoomListSkeleton,
  UserListSkeleton,
  SearchResultSkeleton,
};
