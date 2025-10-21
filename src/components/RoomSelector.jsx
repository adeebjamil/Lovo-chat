import { useState, useEffect } from 'react';

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

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">Rooms</h2>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto p-2">
        {rooms && rooms.length > 0 ? (
          rooms.map((room) => (
            <button
              key={room._id || room.name}
              onClick={() => handleJoinRoom(room.name)}
              className={`w-full text-left px-3 py-2 rounded mb-1 transition ${
                currentRoom === room.name
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">#{room.name}</span>
                <span className="text-xs text-gray-400">
                  {room.members?.length || 0}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {room.type === 'private' ? '🔒 Private' : '🌐 Public'}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center text-gray-400 text-sm py-4">
            Loading rooms...
          </div>
        )}
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <button
          onClick={() => setShowJoinModal(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
        >
          🔑 Join Room
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
        >
          + Create Room
        </button>
      </div>

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-md mx-2 sm:mx-0">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Join Private Room</h3>
            
            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={joinRoomName}
                  onChange={(e) => setJoinRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter private code..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                  required
                  minLength={4}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinRoomName('');
                    setJoinCode('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Room</h3>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                  required
                  minLength={2}
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="What's this room about..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                  rows={2}
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
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Public</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Private</span>
                  </label>
                </div>
              </div>

              {/* Private Code Field - Only show for private rooms */}
              {!isPublic && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Private Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={privateCode}
                    onChange={(e) => setPrivateCode(e.target.value)}
                    placeholder="Create a code (min 4 characters)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                    required={!isPublic}
                    minLength={4}
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Share this code with others to let them join your room
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRoomName('');
                    setNewRoomDescription('');
                    setPrivateCode('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
