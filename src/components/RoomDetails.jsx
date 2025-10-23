import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function RoomDetails({ socket, roomName, currentUser, onClose, onRoomDeleted }) {
  const [roomDetails, setRoomDetails] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    newName: '',
    description: '',
    type: 'public'
  });

  useEffect(() => {
    if (!socket || !roomName) return;

    // Request room details
    socket.emit('room:details', { roomName });

    // Listen for room details
    socket.on('room:details', (details) => {
      setRoomDetails(details);
      setLoadingError(null); // Clear any previous errors
      setEditForm({
        newName: details.name,
        description: details.description || '',
        type: details.type
      });
    });

    socket.on('room:error', (data) => {
      // If it's an access denied error during loading, set loadingError
      if (!roomDetails && data.error.includes('Access denied')) {
        setLoadingError(data.error);
      } else {
        setMessage({ type: 'error', text: data.error });
        setTimeout(() => setMessage(null), 3000);
      }
    });

    socket.on('room:invite-sent', (data) => {
      setMessage({ type: 'success', text: data.message });
      setShowInviteModal(false);
      setSearchQuery('');
      setSearchResults([]);
      socket.emit('room:details', { roomName });
      setTimeout(() => setMessage(null), 3000);
    });
    
    socket.on('room:request-sent', (data) => {
      setMessage({ type: 'success', text: data.message });
      setTimeout(() => setMessage(null), 3000);
    });
    
    socket.on('room:updated', (data) => {
      setMessage({ type: 'success', text: data.message });
      // Update room details with new data
      if (data.room) {
        setRoomDetails(prev => ({
          ...prev,
          ...data.room,
          name: data.room.name,
          description: data.room.description,
          type: data.room.type
        }));
        setEditForm({
          newName: data.room.name,
          description: data.room.description || '',
          type: data.room.type
        });
        setShowEditModal(false);
      }
      setTimeout(() => setMessage(null), 3000);
    });
    
    socket.on('room:deleted', (data) => {
      setMessage({ type: 'success', text: data.message });
      setTimeout(() => {
        onClose();
        if (onRoomDeleted) onRoomDeleted();
      }, 1500);
    });

    return () => {
      socket.off('room:details');
      socket.off('room:error');
      socket.off('room:invite-sent');
      socket.off('room:request-sent');
      socket.off('room:updated');
      socket.off('room:deleted');
    };
  }, [socket, roomName]);

  // Search users
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        const users = await response.json();
        // Filter out users already in the room
        const filteredUsers = users.filter(
          u => !roomDetails?.members?.some(m => m.username === u.username)
        );
        setSearchResults(filteredUsers);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, roomDetails]);

  const handleInvite = (username) => {
    socket.emit('room:invite', { roomName, inviteeUsername: username });
  };
  
  const handleRequestJoin = () => {
    socket.emit('room:request-join', { roomName });
  };
  
  const handleEditRoom = (e) => {
    e.preventDefault();
    socket.emit('room:edit', { 
      roomName, 
      updates: editForm 
    });
    setShowEditModal(false);
  };
  
  const handleDeleteRoom = () => {
    socket.emit('room:delete', { roomName });
    setShowDeleteConfirm(false);
  };

  // Show error state if access denied
  if (loadingError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md mx-2 sm:mx-0 shadow-telegram-lg">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 dark:bg-opacity-30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-telegram-gray-900 dark:text-white text-lg font-semibold mb-2">Access Denied</p>
              <p className="text-telegram-gray-600 dark:text-gray-300 text-sm mb-1">{loadingError}</p>
              <p className="text-telegram-gray-500 dark:text-gray-400 text-xs">You need to join this room first</p>
            </div>
            <button
              onClick={onClose}
              className="btn-telegram w-full"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!roomDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md mx-2 sm:mx-0 shadow-telegram-lg">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-telegram-gray-200 dark:border-gray-700 border-t-telegram-cyan-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-telegram-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-telegram-gray-600 dark:text-gray-300 text-lg font-medium">Loading room details...</p>
            <p className="text-telegram-gray-400 dark:text-gray-500 text-sm">Please wait a moment</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if current user is the creator
  const isCreator = roomDetails.createdBy && currentUser && 
    (roomDetails.createdBy.username === currentUser.username || 
     roomDetails.createdBy._id === currentUser.userId ||
     roomDetails.createdBy._id === currentUser._id);
  
  const isMember = roomDetails.members?.some(m => 
    m.username === currentUser?.username || 
    m.userId === currentUser?.userId ||
    m._id === currentUser?._id
  );

  console.log('🔍 Room Details Debug:', {
    currentUser,
    createdBy: roomDetails.createdBy,
    isCreator,
    isMember
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-0 shadow-telegram-lg scrollbar-telegram">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-telegram-gray-900 dark:text-white">#{roomDetails.name}</h2>
              <span className={`text-xs px-2 py-1 rounded-lg ${
                roomDetails.type === 'private' 
                  ? 'bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30 text-purple-700 dark:text-purple-400' 
                  : 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-400'
              }`}>
                {roomDetails.type === 'private' ? '🔒 Private' : '🌐 Public'}
              </span>
            </div>
            {roomDetails.description && (
              <p className="text-telegram-gray-600 dark:text-gray-300 text-sm">{roomDetails.description}</p>
            )}
            <p className="text-xs text-telegram-gray-500 dark:text-gray-400 mt-1">
              Created by <span className="font-medium">{roomDetails.createdBy?.username}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-telegram-gray-400 dark:text-gray-500 hover:text-telegram-gray-600 dark:hover:text-gray-300 text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg font-medium ${
            message.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
              : 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Action Buttons for Creator */}
        {isCreator && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 px-4 py-2 bg-telegram-cyan-500 dark:bg-telegram-cyan-600 text-white rounded-lg hover:bg-telegram-cyan-600 dark:hover:bg-telegram-cyan-700 transition text-sm font-medium"
            >
              ✏️ Edit Room
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition text-sm font-medium"
            >
              🗑️ Delete Room
            </button>
          </div>
        )}

        {/* Members Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-telegram-gray-900 dark:text-white">
              Members ({roomDetails.members?.length || 0})
            </h3>
            {(isCreator || isMember) && roomDetails.type === 'private' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-telegram-cyan-500 dark:bg-telegram-cyan-600 text-white rounded-lg hover:bg-telegram-cyan-600 dark:hover:bg-telegram-cyan-700 transition text-sm font-medium"
              >
                + Invite Member
              </button>
            )}
          </div>

          <div className="space-y-2">
            {roomDetails.members?.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-3 bg-telegram-gray-50 dark:bg-gray-700 rounded-lg"
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.username}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-telegram-gray-900 dark:text-white">{member.displayName || member.username}</p>
                  <p className="text-xs text-telegram-gray-500 dark:text-gray-400">@{member.username}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg ${
                  member.status === 'online' 
                    ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-400' 
                    : 'bg-telegram-gray-200 dark:bg-gray-600 text-telegram-gray-600 dark:text-gray-300'
                }`}>
                  {member.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                </span>
                {member.username === roomDetails.createdBy?.username && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 text-yellow-700 dark:text-yellow-400">
                    👑 Creator
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Close
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-md mx-2 sm:mx-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Invite to {roomDetails.name}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for a user
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type username or name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="max-h-64 overflow-y-auto mb-4">
              {isSearching ? (
                <p className="text-gray-500 text-sm text-center py-4">Searching...</p>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.username}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{user.displayName || user.username}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                      <button
                        onClick={() => handleInvite(user.username)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <p className="text-gray-500 text-sm text-center py-4">No users found</p>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  Type at least 2 characters to search
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setShowInviteModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-md mx-2 sm:mx-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Edit Room</h3>
            
            <form onSubmit={handleEditRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={editForm.newName}
                  onChange={(e) => setEditForm({ ...editForm, newName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                  required
                  minLength={2}
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={editForm.type === 'public'}
                      onChange={() => setEditForm({ ...editForm, type: 'public' })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Public</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={editForm.type === 'private'}
                      onChange={() => setEditForm({ ...editForm, type: 'private' })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Private</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-md mx-2 sm:mx-0">
            <h3 className="text-lg sm:text-xl font-bold text-red-600 mb-4">⚠️ Delete Room</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>#{roomDetails.name}</strong>? 
              This will permanently delete all messages and cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
