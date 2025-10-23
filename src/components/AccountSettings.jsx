import { useState } from 'react';
import NotificationSettings from './NotificationSettings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AccountSettings({ user, token, onClose, onLogout }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile edit states
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: user.displayName || user.username,
    bio: user.bio || '',
    avatar: user.avatar || '',
    status: user.status || 'online'
  });

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const data = await response.json();
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Update user data in parent component if needed
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">✅ {success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">❌ {error}</p>
            </div>
          )}

          {/* Profile Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Profile</h3>
              <button
                onClick={() => {
                  setIsEditing(!isEditing);
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {isEditing ? 'Cancel' : '✏️ Edit Profile'}
              </button>
            </div>

            {!isEditing ? (
              /* View Mode */
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
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{profileData.displayName}</p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  {user.email && (
                    <p className="text-xs text-gray-400">{user.email}</p>
                  )}
                  {profileData.bio && (
                    <p className="text-sm text-gray-600 mt-1">{profileData.bio}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Status: <span className={`font-medium ${
                      profileData.status === 'online' ? 'text-green-600' : 
                      profileData.status === 'away' ? 'text-yellow-600' : 'text-gray-600'
                    }`}>{profileData.status}</span>
                  </p>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your display name"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio <span className="text-xs text-gray-500">(max 200 characters)</span>
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    maxLength={200}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Tell us about yourself..."
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {profileData.bio.length}/200
                  </p>
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={profileData.avatar}
                    onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={profileData.status}
                    onChange={(e) => setProfileData({ ...profileData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="online">🟢 Online</option>
                    <option value="away">🟡 Away</option>
                    <option value="offline">⚫ Offline</option>
                  </select>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* Notification Settings */}
          <div className="pt-4 border-t">
            <NotificationSettings />
          </div>

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
