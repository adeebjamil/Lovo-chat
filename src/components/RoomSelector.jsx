import { useState, useEffect } from 'react';
import Icons from './Icons';

export default function RoomSelector({ socket, currentRoom, onRoomChange }) {
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [privateCode, setPrivateCode] = useState('');
  const [joinRoomName, setJoinRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!socket) return;

    // Request rooms list on mount
    socket.emit('rooms:list');

    // Listen for rooms updates
    socket.on('rooms:list', (roomsList) => {
      setRooms(roomsList);
    });

    socket.on('room:created', (room) => {
      setRooms(prev => [...prev, room]);
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomDescription('');
      setPrivateCode('');
    });

    // Listen for new public rooms from other users
    socket.on('room:available', (room) => {
      setRooms(prev => {
        // Check if room already exists
        if (prev.find(r => r.name === room.name)) return prev;
        return [...prev, room];
      });
    });
    
    socket.on('room:error', (data) => {
      setMessage({ type: 'error', text: data.error });
      setTimeout(() => setMessage(null), 3000);
    });
    
    socket.on('room:join-success', (data) => {
      setMessage({ type: 'success', text: data.message });
      setShowJoinModal(false);
      setJoinRoomName('');
      setJoinCode('');
      setTimeout(() => setMessage(null), 3000);
    });

    return () => {
      socket.off('rooms:list');
      socket.off('room:created');
      socket.off('room:available');
      socket.off('room:error');
      socket.off('room:join-success');
    };
  }, [socket]);

  const handleJoinRoom = (roomName) => {
    if (roomName === currentRoom) return;
    socket.emit('room:join', { room: roomName });
    onRoomChange(roomName);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    
    // Validate private code if room is private
    if (!isPublic && (!privateCode || privateCode.length < 4)) {
      setMessage({ type: 'error', text: 'Private rooms need a code (min 4 characters)' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    socket.emit('room:create', {
      name: newRoomName.trim(),
      description: newRoomDescription.trim(),
      type: isPublic ? 'public' : 'private',
      privateCode: isPublic ? null : privateCode
    });
  };
  
  const handleJoinWithCode = (e) => {
    e.preventDefault();
    if (!joinRoomName.trim() || !joinCode.trim()) return;
    
    socket.emit('room:join-with-code', {
      roomName: joinRoomName.trim(),
      privateCode: joinCode.trim()
    });
  };

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-telegram-gray-200 dark:border-gray-700 flex flex-col h-full shadow-telegram">
      {/* Header - Telegram Style with Dark Mode */}
      <div className="px-4 py-4 border-b border-telegram-gray-200 dark:border-gray-700 bg-telegram-cyan-500 dark:bg-telegram-cyan-600">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icons.Users className="w-5 h-5" />
          Rooms
        </h2>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-3 border-b border-telegram-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
            className="w-full pl-9 pr-9 py-2 bg-telegram-gray-50 dark:bg-gray-700 border border-telegram-gray-200 dark:border-gray-600 rounded-lg text-sm text-telegram-gray-900 dark:text-gray-100 placeholder-telegram-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-telegram-cyan-500 dark:focus:ring-telegram-cyan-600 focus:border-transparent transition-all"
          />
          <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-telegram-gray-400 dark:text-gray-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-telegram-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            >
              <Icons.Close className="w-3.5 h-3.5 text-telegram-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Rooms List with Custom Scrollbar */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-telegram">
        {filteredRooms && filteredRooms.length > 0 ? (
          filteredRooms.map((room) => (
            <button
              key={room._id || room.name}
              onClick={() => handleJoinRoom(room.name)}
              className={`w-full text-left px-3 py-3 rounded-lg mb-1 transition-all duration-200 group ${
                currentRoom === room.name
                  ? 'bg-telegram-cyan-500 dark:bg-telegram-cyan-600 text-white shadow-telegram'
                  : 'hover:bg-telegram-gray-50 dark:hover:bg-gray-700 text-telegram-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate flex items-center gap-2">
                  {room.type === 'private' ? (
                    <Icons.Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <Icons.Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  {room.name}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  currentRoom === room.name
                    ? 'bg-white bg-opacity-20 text-white'
                    : 'bg-telegram-gray-200 dark:bg-gray-700 text-telegram-gray-600 dark:text-gray-300'
                }`}>
                  {room.members?.length || 0}
                </span>
              </div>
              <div className={`text-xs flex items-center gap-1 ${
                currentRoom === room.name ? 'text-white text-opacity-80' : 'text-telegram-gray-500 dark:text-gray-400'
              }`}>
                {room.type === 'private' ? 'Private' : 'Public'}
              </div>
            </button>
          ))
        ) : searchQuery ? (
          <div className="text-center text-telegram-gray-500 dark:text-gray-400 text-sm py-8">
            <Icons.Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium mb-1">No rooms found</p>
            <p className="text-xs">Try a different search term</p>
          </div>
        ) : (
          <div className="text-center text-telegram-gray-500 dark:text-gray-400 text-sm py-8">
            <Icons.Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No rooms available</p>
          </div>
        )}
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`mx-3 mb-3 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? (
            <Icons.Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Icons.Info className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Action Buttons - Telegram Style with Dark Mode */}
      <div className="p-3 border-t border-telegram-gray-200 dark:border-gray-700 space-y-2 bg-white dark:bg-gray-800">
        <button
          onClick={() => setShowJoinModal(true)}
          className="btn-telegram-outline w-full flex items-center justify-center gap-2"
        >
          <Icons.Lock className="w-4 h-4" />
          Join Room
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-telegram w-full flex items-center justify-center gap-2"
        >
          <Icons.Plus className="w-4 h-4" />
          Create Room
        </button>
      </div>

      {/* Join Room Modal - Telegram Style */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-telegram-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-telegram-gray-900 flex items-center gap-2">
                <Icons.Lock className="w-6 h-6 text-telegram-cyan-500" />
                Join Private Room
              </h3>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinRoomName('');
                  setJoinCode('');
                }}
                className="icon-button text-telegram-gray-500"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-telegram-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={joinRoomName}
                  onChange={(e) => setJoinRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="input-telegram"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-gray-700 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter private code..."
                  className="input-telegram"
                  required
                  minLength={4}
                />
                <p className="text-xs text-telegram-gray-500 mt-1">
                  Ask the room creator for the access code
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinRoomName('');
                    setJoinCode('');
                  }}
                  className="btn-telegram-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-telegram flex-1"
                >
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Room Modal - Telegram Style */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-telegram-lg scrollbar-telegram">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-telegram-gray-900 flex items-center gap-2">
                <Icons.Plus className="w-6 h-6 text-telegram-cyan-500" />
                Create New Room
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoomName('');
                  setNewRoomDescription('');
                  setPrivateCode('');
                }}
                className="icon-button text-telegram-gray-500"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-telegram-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="input-telegram"
                  required
                  minLength={2}
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-gray-700 mb-2">
                  Description <span className="text-telegram-gray-500">(optional)</span>
                </label>
                <textarea
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="What's this room about..."
                  className="input-telegram resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-telegram-gray-500 mt-1 text-right">
                  {newRoomDescription.length}/200
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-gray-700 mb-3">
                  Room Type
                </label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    isPublic 
                      ? 'border-telegram-cyan-500 bg-telegram-cyan-50 text-telegram-cyan-700' 
                      : 'border-telegram-gray-300 hover:border-telegram-gray-400'
                  }`}>
                    <input
                      type="radio"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="sr-only"
                    />
                    <Icons.Globe className="w-4 h-4" />
                    <span className="font-medium">Public</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    !isPublic 
                      ? 'border-telegram-cyan-500 bg-telegram-cyan-50 text-telegram-cyan-700' 
                      : 'border-telegram-gray-300 hover:border-telegram-gray-400'
                  }`}>
                    <input
                      type="radio"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="sr-only"
                    />
                    <Icons.Lock className="w-4 h-4" />
                    <span className="font-medium">Private</span>
                  </label>
                </div>
              </div>

              {/* Private Code Field - Only show for private rooms */}
              {!isPublic && (
                <div className="bg-telegram-cyan-50 border border-telegram-cyan-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-telegram-gray-700 mb-2">
                    Private Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={privateCode}
                    onChange={(e) => setPrivateCode(e.target.value)}
                    placeholder="Create a code (min 4 characters)..."
                    className="input-telegram"
                    required={!isPublic}
                    minLength={4}
                    maxLength={20}
                  />
                  <div className="flex items-start gap-2 mt-2">
                    <Icons.Info className="w-4 h-4 text-telegram-cyan-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-telegram-cyan-700">
                      Share this code with others to let them join your private room
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRoomName('');
                    setNewRoomDescription('');
                    setPrivateCode('');
                  }}
                  className="btn-telegram-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-telegram flex-1"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
