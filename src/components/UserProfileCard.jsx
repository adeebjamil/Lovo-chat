import React, { useState, useEffect } from 'react';

const UserProfileCard = ({ userId, username, x, y, onClose, socket }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket || !userId) return;

    setIsLoading(true);
    socket.emit('user:get-profile', { userId }, (response) => {
      if (response.error) {
        setError(response.error);
      } else {
        setProfile(response.profile);
      }
      setIsLoading(false);
    });
  }, [socket, userId]);

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const diffMins = Math.floor((new Date() - new Date(lastSeen)) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80 z-[9999]"
      style={{
        top: `${y}px`,
        left: `${x}px`,
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-500 dark:text-red-400">
          <p className="text-sm">{error}</p>
        </div>
      ) : profile ? (
        <div>
          {/* Avatar & Name */}
          <div className="flex items-center gap-3 mb-3">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {profile.displayName || profile.username}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                @{profile.username}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`w-3 h-3 rounded-full ${
                profile.status === 'online'
                  ? 'bg-green-500'
                  : profile.status === 'away'
                  ? 'bg-yellow-500'
                  : 'bg-gray-400'
              }`}
            ></div>
            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {profile.status}
            </span>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Last Seen */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {profile.status === 'online'
                ? 'Active now'
                : `Last seen ${formatLastSeen(profile.lastSeen)}`}
            </span>
          </div>

          {/* Member Since */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              Joined {new Date(profile.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UserProfileCard;
