import { useState } from 'react';
import NotificationSettings from './NotificationSettings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AccountSettings({ user, token, onClose, onLogout }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account deleted successfully, logout user
      alert('Your account has been deleted successfully.');
      onLogout();
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-[95vw] sm:max-w-md w-full mx-2 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Account Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* User Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.username} 
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{user.username}</p>
              {user.email && (
                <p className="text-sm text-gray-500">{user.email}</p>
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="pt-4 border-t">
            <NotificationSettings />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Danger Zone */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Danger Zone</h3>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                🗑️ Delete Account
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">
                    Are you absolutely sure?
                  </p>
                  <p className="text-xs text-red-700">
                    This action cannot be undone. This will permanently delete your account, 
                    remove you from all rooms, and delete all your messages.
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
