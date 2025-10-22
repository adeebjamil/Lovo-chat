import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import toast, { Toaster } from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import useDarkMode from '../hooks/useDarkMode';
import { useAnalytics } from './PerformanceMonitor';
import RoomSelector from './RoomSelector';
import RoomDetails from './RoomDetails';
import AccountSettings from './AccountSettings';
import NotificationBell from './NotificationBell';
import SearchBar from './SearchBar';
import SearchModal from './SearchModal';
import ReadReceipts from './ReadReceipts';
import MessageContextMenu from './MessageContextMenu';
import UserProfileCard from './UserProfileCard';
import { MessageSkeleton } from './SkeletonLoader';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true
});

export default function ChatRoom({ user, token, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const { trackUserAction } = useAnalytics();
  const [currentRoom, setCurrentRoom] = useState('general');
  const [roomInfo, setRoomInfo] = useState({ room: 'general', userCount: 0 });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showReadReceipts, setShowReadReceipts] = useState(false);
  const [selectedMessageForReceipts, setSelectedMessageForReceipts] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  
  // Phase 3.7: Enhanced UI/UX states
  const [isDarkMode, toggleDarkMode] = useDarkMode();
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [profileCardPosition, setProfileCardPosition] = useState({ x: 0, y: 0 });
  
  // Mobile responsive state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});
  const hoverTimeoutRef = useRef(null);

  const { socket, isConnected, connectionError, emit } = useSocket(WS_URL, token);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load message history when joining a room
  const loadMessageHistory = (room) => {
    if (!socket) return;
    
    setLoadingHistory(true);
    socket.emit('messages:history', { room, limit: 50 }, (response) => {
      if (response && response.messages) {
        setMessages(response.messages);
      }
      setLoadingHistory(false);
    });
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Room joined
    socket.on('room:joined', (data) => {
      setRoomInfo(data);
      setMessages([]); // Clear messages when joining new room
      
      // Add welcome message
      setMessages([{
        id: `sys_${Date.now()}`,
        type: 'system',
        content: `Welcome to #${data.room}! ${data.userCount} user(s) online.`,
        timestamp: new Date().toISOString()
      }]);
      
      // Load message history for this room
      loadMessageHistory(data.room);
    });

    // Room invitation received
    socket.on('room:invited', (data) => {
      setMessages(prev => [...prev, {
        id: `invite_${Date.now()}`,
        type: 'system',
        content: `🎉 ${data.message}`,
        timestamp: new Date().toISOString()
      }]);
      
      // Refresh room list
      socket.emit('rooms:list');
    });
    
    // Room deleted
    socket.on('room:deleted', (data) => {
      setMessages(prev => [...prev, {
        id: `deleted_${Date.now()}`,
        type: 'system',
        content: `⚠️ ${data.message}`,
        timestamp: new Date().toISOString()
      }]);
      
      // If currently in deleted room, switch to general
      if (currentRoom === data.roomName) {
        handleRoomChange('general');
      }
      
      // Refresh room list
      socket.emit('rooms:list');
    });
    
    // Room updated
    socket.on('room:updated', (data) => {
      setMessages(prev => [...prev, {
        id: `updated_${Date.now()}`,
        type: 'system',
        content: `ℹ️ ${data.message}`,
        timestamp: new Date().toISOString()
      }]);
      
      // Update current room if it matches
      if (currentRoom === data.oldName) {
        setCurrentRoom(data.room.name);
      }
      
      // Refresh room list
      socket.emit('rooms:list');
    });
    
    // Join request approved
    socket.on('room:join-approved', (data) => {
      setMessages(prev => [...prev, {
        id: `approved_${Date.now()}`,
        type: 'system',
        content: `✅ ${data.message}`,
        timestamp: new Date().toISOString()
      }]);
      
      // Refresh room list to show new room
      socket.emit('rooms:list');
    });

    // Message history received
    socket.on('messages:history', (data) => {
      if (data && data.messages) {
        setMessages(data.messages);
        setLoadingHistory(false);
      }
    });

    // User joined
    socket.on('user:joined', (data) => {
      setMessages(prev => [...prev, {
        id: `join_${Date.now()}`,
        type: 'system',
        content: `${data.username} joined the chat`,
        timestamp: data.timestamp
      }]);
      setRoomInfo(prev => ({ ...prev, userCount: prev.userCount + 1 }));
    });

    // User left
    socket.on('user:left', (data) => {
      setMessages(prev => [...prev, {
        id: `leave_${Date.now()}`,
        type: 'system',
        content: `${data.username} left the chat`,
        timestamp: data.timestamp
      }]);
      setRoomInfo(prev => ({ ...prev, userCount: Math.max(0, prev.userCount - 1) }));
    });

    // Message received from others
    socket.on('message:received', (message) => {
      console.log('📥 message:received event fired:', message.id || message._id);
      setMessages(prev => {
        // Prevent duplicates by checking if message already exists
        const messageId = message._id || message.id;
        const exists = prev.some(msg => (msg._id || msg.id) === messageId);
        if (exists) {
          console.warn('⚠️ DUPLICATE message:received detected, skipping:', messageId);
          return prev;
        }
        console.log('✅ Adding new message from message:received:', messageId);
        return [...prev, message];
      });
      
      // Mark message as read if it's from someone else
      if (message.userId !== user.userId) {
        setTimeout(() => {
          socket.emit('message:read', { 
            messageId: message._id || message.id, 
            room: currentRoom 
          });
        }, 1000); // Wait 1 second before marking as read
      }
    });
    
    // Message sent confirmation (for sender only)
    socket.on('message:sent', (message) => {
      console.log('📤 message:sent event fired:', message.id || message._id);
      setMessages(prev => {
        // Prevent duplicates by checking if message already exists
        const messageId = message._id || message.id;
        const exists = prev.some(msg => (msg._id || msg.id) === messageId);
        if (exists) {
          console.warn('⚠️ DUPLICATE message:sent detected, skipping:', messageId);
          return prev;
        }
        console.log('✅ Adding new message from message:sent:', messageId);
        return [...prev, message];
      });
    });
    
    // Read receipt received
    socket.on('message:read-receipt', (data) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId || msg._id === data.messageId) {
          const readBy = msg.readBy || [];
          const alreadyRead = readBy.some(r => r.userId === data.userId);
          
          if (!alreadyRead) {
            return {
              ...msg,
              readBy: [...readBy, {
                userId: data.userId,
                username: data.username,
                readAt: data.readAt
              }]
            };
          }
        }
        return msg;
      }));
    });
    
    // Message edited
    socket.on('message:edited', (data) => {
      setMessages(prev => prev.map(msg => 
        (msg.id === data.messageId || msg._id === data.messageId) 
          ? { ...msg, content: data.content, edited: true }
          : msg
      ));
      setEditingMessageId(null);
      setEditContent('');
    });
    
    // Message deleted
    socket.on('message:deleted', (data) => {
      setMessages(prev => prev.filter(msg => 
        msg.id !== data.messageId && msg._id !== data.messageId
      ));
    });
    
    // Message reactions
    socket.on('message:reacted', (data) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId || msg._id === data.messageId) {
          return { ...msg, reactions: data.reactions };
        }
        return msg;
      }));
    });
    
    // Message error
    socket.on('message:error', (data) => {
      alert(data.error);
      setEditingMessageId(null);
      setEditContent('');
      setReplyingTo(null);
    });

    // Typing indicators
    socket.on('user:typing', (data) => {
      setTypingUsers(prev => new Set([...prev, data.username]));
    });

    socket.on('user:stopped-typing', (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.username);
        return newSet;
      });
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:invited');
      socket.off('room:deleted');
      socket.off('room:updated');
      socket.off('room:join-approved');
      socket.off('messages:history');
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('message:received');
      socket.off('message:sent');
      socket.off('message:read-receipt');
      socket.off('message:edited');
      socket.off('message:deleted');
      socket.off('message:reacted');
      socket.off('message:error');
      socket.off('user:typing');
      socket.off('user:stopped-typing');
    };
  }, [socket]);

  // Handle room change
  const handleRoomChange = (newRoom) => {
    setCurrentRoom(newRoom);
    setTypingUsers(new Set());
    // Don't clear messages here - let room:joined handle it
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!isConnected) return;

    emit('typing:start');

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      emit('typing:stop');
    }, 2000);
  };

  // Handle send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !isConnected) return;

    // If replying, use reply handler
    if (replyingTo) {
      sendReply();
      return;
    }

    // Sanitize message content to prevent XSS
    const sanitizedContent = DOMPurify.sanitize(inputMessage.trim(), {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [] // No attributes allowed
    });

    emit('message:send', {
      content: sanitizedContent,
      room: currentRoom
    });

    setInputMessage('');
    emit('typing:stop');
    
    // Track analytics
    trackUserAction('message_sent', { room: currentRoom });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
  
  // Handle edit message
  const handleEditMessage = (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setEditContent(currentContent);
    trackUserAction('message_edit_started');
  };
  
  const handleSaveEdit = (messageId) => {
    if (!editContent.trim()) return;
    
    // Sanitize edited content
    const sanitizedContent = DOMPurify.sanitize(editContent.trim(), {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [] // No attributes allowed
    });
    
    emit('message:edit', {
      messageId,
      content: sanitizedContent,
      room: currentRoom
    });
    
    setEditingMessageId(null);
    setEditContent('');
  };
  
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };
  
  // Handle delete message
  const handleDeleteMessage = (messageId) => {
    if (confirm('Are you sure you want to delete this message?')) {
      emit('message:delete', {
        messageId,
        room: currentRoom
      });
    }
  };

  // Handle message reaction
  const handleReaction = (messageId, emoji) => {
    emit('message:react', {
      messageId,
      emoji,
      room: currentRoom
    });
    setShowReactionPicker(null);
  };

  // Handle reply to message
  const handleReply = (message) => {
    setReplyingTo({
      id: message.id || message._id,
      username: message.username || message.user?.username,
      content: message.content
    });
    setShowReactionPicker(null);
  };

  // Show read receipts modal
  const handleShowReadReceipts = (messageId) => {
    setSelectedMessageForReceipts(messageId);
    setShowReadReceipts(true);
  };

  // Phase 3.7: Context Menu Handlers
  const handleContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message
    });
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard!');
  };

  // Phase 3.7: User Profile Card Handlers
  const handleAvatarHover = (e, userId, username) => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect();
      setProfileCardPosition({
        x: rect.right + 10,
        y: rect.top
      });
      setHoveredUser({ userId, username });
    }, 500); // Show after 500ms hover
  };

  const handleAvatarLeave = () => {
    clearTimeout(hoverTimeoutRef.current);
    setHoveredUser(null);
  };

  // Phase 3.7: Emoji Picker Handler
  const handleEmojiSelect = (emoji) => {
    setInputMessage(prev => prev + emoji.native);
    setShowEmojiPicker(null);
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Send reply
  const sendReply = () => {
    if (!inputMessage.trim() || !replyingTo) return;

    const sanitizedContent = DOMPurify.sanitize(inputMessage.trim(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });

    emit('message:reply', {
      content: sanitizedContent,
      replyToId: replyingTo.id,
      room: currentRoom
    });

    setInputMessage('');
    setReplyingTo(null);
    emit('typing:stop');
  };

  // Scroll to message
  const scrollToMessage = (messageId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => element.classList.remove('highlight-message'), 2000);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (message) => {
    // Check if message is in current room
    if (message.room && message.room._id) {
      // If different room, switch to it first
      if (message.room._id !== roomInfo.room) {
        handleRoomChange(message.room.name);
        // Wait for room to load, then scroll
        setTimeout(() => {
          scrollToMessage(message._id);
        }, 1000);
      } else {
        // Same room, just scroll
        scrollToMessage(message._id);
      }
    }
  };

  // Handle mentions (@username)
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputMessage(value);

    // Check for @ mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      // Just typed @, show all users
      setShowMentionDropdown(true);
      // In a real app, you'd fetch users from the room here
      setMentionSuggestions([]);
    } else if (lastAtIndex !== -1 && lastAtIndex < value.length - 1) {
      const searchTerm = value.slice(lastAtIndex + 1).toLowerCase();
      if (!searchTerm.includes(' ')) {
        // Filter users by search term
        const uniqueUsers = [...new Set(messages.map(m => m.username || m.user?.username))].filter(Boolean);
        const filtered = uniqueUsers.filter(u => u.toLowerCase().startsWith(searchTerm));
        setMentionSuggestions(filtered);
        setShowMentionDropdown(filtered.length > 0);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }

    handleTyping();
  };

  // Select mention
  const selectMention = (username) => {
    const lastAtIndex = inputMessage.lastIndexOf('@');
    const newValue = inputMessage.slice(0, lastAtIndex) + `@${username} `;
    setInputMessage(newValue);
    setShowMentionDropdown(false);
  };

  // Format message content with markdown
  const formatMessageContent = (content) => {
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // Highlight mentions
    const withMentions = sanitized.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    // Simple markdown: **bold**, *italic*, `code`
    const formatted = withMentions
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-black bg-opacity-20 px-1 rounded">$1</code>');
    
    return formatted;
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPG, PNG, GIF, PDF, DOC, DOCX, and TXT files are allowed.');
      return;
    }

    setSelectedFile(file);
    setUploadingFile(true);
    setUploadProgress(0);
    
    const uploadToast = toast.loading('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room', currentRoom);

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // DON'T add message to local state - let socket handle it
      // setMessages(prev => [...prev, data.message]); // REMOVED to prevent duplication

      // Broadcast to room via socket - server will send it back to all clients
      emit('message:send', {
        content: data.message.content,
        room: currentRoom,
        type: data.message.type,
        fileUrl: data.message.fileUrl,
        fileName: data.message.fileName,
        fileType: data.message.fileType,
        fileSize: data.message.fileSize
      });

      setUploadProgress(100);
      toast.success('File uploaded successfully!', { id: uploadToast });
      setTimeout(() => {
        setUploadingFile(false);
        setSelectedFile(null);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.', { id: uploadToast });
      setUploadingFile(false);
      setSelectedFile(null);
      setUploadProgress(0);
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex overflow-hidden">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: isDarkMode ? '#374151' : '#fff',
            color: isDarkMode ? '#f3f4f6' : '#111',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      {/* Room Selector Sidebar - Desktop: always visible, Mobile: slide-in */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        transition-transform duration-300 ease-in-out
      `}>
        <RoomSelector 
          socket={socket} 
          currentRoom={currentRoom} 
          onRoomChange={(room) => {
            handleRoomChange(room);
            setIsMobileSidebarOpen(false);
          }}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full lg:w-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
            {/* Left Section: Mobile Menu + Room Info */}
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              {/* Hamburger Menu - Mobile Only */}
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition flex-shrink-0"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="text-xl sm:text-2xl flex-shrink-0">💬</div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white truncate">
                  #{roomInfo.room}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                  {roomInfo.userCount} user(s) online
                </p>
              </div>
              <button
                onClick={() => setShowRoomDetails(true)}
                className="hidden sm:flex ml-2 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition items-center flex-shrink-0"
                title="View room details"
              >
                ℹ️ Info
              </button>
            </div>
            
            {/* Right Section: Actions (Responsive) */}
            <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink-0">
              {/* Search Bar - Hide on mobile */}
              <div className="hidden md:block">
                <SearchBar onSearchClick={() => setShowSearchModal(true)} />
              </div>
              
              {/* Mobile Search Button */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
                title="Search messages"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Notification Bell */}
              <NotificationBell socket={socket} token={token} />

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  // Sun icon
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  // Moon icon
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Connection Status - Hide on small screens */}
              <div className="hidden xl:flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* User Info - Simplified on mobile */}
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{user.username}</p>
                  {user.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">{user.email}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAccountSettings(true)}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      title="Account Settings"
                    >
                      ⚙️ Settings
                    </button>
                    <button
                      onClick={onLogout}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Connection Error Banner */}
        {connectionError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <div className="max-w-7xl mx-auto">
              <p className="text-sm text-red-700">
                ⚠️ Connection error: {connectionError}
              </p>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            {loadingHistory && (
              <div className="space-y-3">
                <MessageSkeleton />
                <MessageSkeleton />
                <MessageSkeleton />
              </div>
            )}

            {messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id || msg._id} className="text-center">
                    <span className="inline-block bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              const isOwnMessage = msg.userId === user.userId || msg.user?._id === user.userId;

              return (
                <div
                  key={msg.id || msg._id}
                  className={`flex items-end gap-2 mb-3 ${isOwnMessage ? 'justify-start' : 'justify-end'}`}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                >
                  {/* Avatar for sender (own messages) on left */}
                  {isOwnMessage && (
                    <>
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt="You" 
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer"
                          onMouseEnter={(e) => handleAvatarHover(e, user.userId, user.username)}
                          onMouseLeave={handleAvatarLeave}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 cursor-pointer" 
                        style={{display: user.avatar ? 'none' : 'flex'}}
                        onMouseEnter={(e) => handleAvatarHover(e, user.userId, user.username)}
                        onMouseLeave={handleAvatarLeave}
                      >
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    </>
                  )}
                  
                  <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[60%] group relative`}>
                    <div className={`flex items-baseline gap-2 mb-1 text-xs ${isOwnMessage ? 'justify-start' : 'justify-end'}`}>
                      <span className={`font-medium ${isOwnMessage ? 'text-green-600' : 'text-blue-600'}`}>
                        {isOwnMessage ? 'You' : (msg.username || msg.user?.username)}
                      </span>
                      <span className="text-gray-400">
                        {formatTime(msg.timestamp || msg.createdAt)}
                        {msg.edited && <span className="ml-1 text-[10px]">(edited)</span>}
                      </span>
                    </div>
                    
                    {editingMessageId === (msg.id || msg._id) ? (
                      // Edit Mode
                      <div className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow-lg">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full text-sm p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(msg._id || msg.id)}
                            className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div
                        ref={el => messageRefs.current[msg.id || msg._id] = el}
                        className={`rounded-2xl px-4 py-2 relative shadow-sm ${
                          isOwnMessage
                            ? 'bg-green-500 text-white rounded-bl-none'
                            : 'bg-blue-500 text-white rounded-br-none'
                        }`}
                      >
                        {/* Reply Preview */}
                        {msg.replyTo && (
                          <div 
                            className="mb-2 p-2 bg-black bg-opacity-20 rounded cursor-pointer hover:bg-opacity-30 transition"
                            onClick={() => scrollToMessage(msg.replyTo.id)}
                          >
                            <p className="text-xs opacity-75">↩️ Replying to {msg.replyTo.username}</p>
                            <p className="text-xs truncate opacity-90">{msg.replyTo.content}</p>
                          </div>
                        )}

                        {/* Image Preview */}
                        {msg.type === 'image' && msg.fileUrl && (
                          <div className="mb-2">
                            <img 
                              src={msg.fileUrl} 
                              alt={msg.fileName || 'Image'} 
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition"
                              style={{ maxHeight: '300px' }}
                              onClick={() => window.open(msg.fileUrl, '_blank')}
                            />
                          </div>
                        )}

                        {/* File Download Link */}
                        {msg.type === 'file' && msg.fileUrl && (
                          <div className="mb-2 p-3 bg-white bg-opacity-20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">📎</span>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{msg.fileName}</p>
                                <p className="text-xs opacity-75">
                                  {msg.fileSize ? `${(msg.fileSize / 1024).toFixed(2)} KB` : 'Unknown size'}
                                </p>
                              </div>
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-white bg-opacity-30 hover:bg-opacity-40 rounded text-xs font-medium transition"
                              >
                                Download
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Message Content with Markdown */}
                        {msg.type === 'text' && (
                          <p 
                            className="text-sm break-words leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: formatMessageContent(msg.content)
                            }}
                          />
                        )}

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(
                              msg.reactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg._id || msg.id, emoji)}
                                className="bg-white bg-opacity-30 hover:bg-opacity-50 px-2 py-1 rounded text-xs transition"
                              >
                                {emoji} {count}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Read Receipt Checkmarks (for own messages only) */}
                        {isOwnMessage && (msg._id || msg.id) && (
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            {msg.readBy && msg.readBy.length > 0 ? (
                              <button
                                onClick={() => handleShowReadReceipts(msg._id || msg.id)}
                                className="flex items-center gap-1 text-xs opacity-75 hover:opacity-100 transition cursor-pointer"
                                title={`Read by ${msg.readBy.length} ${msg.readBy.length === 1 ? 'person' : 'people'}`}
                              >
                                <svg className="w-3 h-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <svg className="w-3 h-3 text-blue-200 -ml-1.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            ) : msg.status === 'sent' || msg._id ? (
                              // Double checkmark (delivered)
                              <div className="flex items-center gap-0 text-xs opacity-60" title="Delivered">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <svg className="w-3 h-3 text-white -ml-1.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              // Single checkmark (sent)
                              <div className="flex items-center text-xs opacity-60" title="Sent">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Action Buttons - Show on hover and touch */}
                        {(msg._id || msg.id) && (
                          <div className="absolute -top-8 left-0 flex opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200 gap-1 bg-gray-800 text-white shadow-lg rounded-lg px-2 py-1 text-xs z-10">
                            {/* Reactions */}
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === (msg._id || msg.id) ? null : (msg._id || msg.id))}
                              className="hover:text-yellow-300 transition px-1"
                              title="Add reaction"
                            >
                              😊
                            </button>
                            
                            {/* Reply */}
                            <button
                              onClick={() => handleReply(msg)}
                              className="hover:text-blue-300 transition px-1"
                              title="Reply"
                            >
                              ↩️ Reply
                            </button>
                            
                            {/* Edit (own messages only) */}
                            {isOwnMessage && msg.type === 'text' && (
                              <>
                                <span className="text-gray-500">|</span>
                                <button
                                  onClick={() => handleEditMessage(msg._id || msg.id, msg.content)}
                                  className="hover:text-blue-300 transition px-1"
                                  title="Edit message"
                                >
                                  ✏️ Edit
                                </button>
                              </>
                            )}
                            
                            {/* Delete (own messages only) */}
                            {isOwnMessage && (
                              <>
                                <span className="text-gray-500">|</span>
                                <button
                                  onClick={() => handleDeleteMessage(msg._id || msg.id)}
                                  className="hover:text-red-300 transition px-1"
                                  title="Delete message"
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Reaction Picker */}
                        {showReactionPicker === (msg._id || msg.id) && (
                          <div className="absolute -top-12 left-0 bg-white shadow-lg rounded-lg p-2 flex gap-1 z-20">
                            {['😊', '😂', '❤️', '👍', '👎', '🔥', '🎉', '😮'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg._id || msg.id, emoji)}
                                className="hover:bg-gray-100 p-1 rounded text-lg transition"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Avatar for receiver (other messages) on right */}
                  {!isOwnMessage && (
                    <>
                      {msg.user?.avatar ? (
                        <img 
                          src={msg.user.avatar} 
                          alt={msg.username || msg.user?.username} 
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer"
                          onMouseEnter={(e) => handleAvatarHover(e, msg.userId || msg.user?._id, msg.username || msg.user?.username)}
                          onMouseLeave={handleAvatarLeave}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 cursor-pointer" 
                        style={{display: msg.user?.avatar ? 'none' : 'flex'}}
                        onMouseEnter={(e) => handleAvatarHover(e, msg.userId || msg.user?._id, msg.username || msg.user?.username)}
                        onMouseLeave={handleAvatarLeave}
                      >
                        {(msg.username || msg.user?.username || '?').charAt(0).toUpperCase()}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="flex items-end gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {Array.from(typingUsers)[0].charAt(0).toUpperCase()}
                </div>
                <div className="bg-gray-300 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-700 mr-2">
                      {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing
                    </span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div 
          className={`bg-white border-t border-gray-200 shadow-lg relative ${dragActive ? 'bg-blue-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white px-6 py-4 rounded-lg shadow-lg">
                <p className="text-lg font-semibold text-blue-600">📎 Drop file to upload</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadingFile && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">Uploading {selectedFile?.name}...</span>
                <span className="text-sm font-semibold text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="px-2 sm:px-4 py-3 sm:py-4">
            <form onSubmit={handleSendMessage} className="flex space-x-1 sm:space-x-3">
              {/* File Upload Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf,.doc,.docx,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isConnected || uploadingFile}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-semibold px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                title="Upload file (Max 10MB)"
              >
                📎
              </button>

              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Emoji picker toggled:', !showEmojiPicker);
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  disabled={!isConnected || uploadingFile}
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-semibold px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                  title="Add emoji"
                >
                  😊
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-2 right-0 z-[9999]">
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme={isDarkMode ? 'dark' : 'light'}
                      onClickOutside={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>

              <input
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                placeholder={isConnected ? (replyingTo ? `Replying to ${replyingTo.username}...` : "Type a message...") : "Connecting..."}
                disabled={!isConnected || uploadingFile}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={!isConnected || !inputMessage.trim() || uploadingFile}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
              >
                {replyingTo ? 'Reply' : 'Send'}
              </button>
            </form>

            {/* Mention Dropdown */}
            {showMentionDropdown && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full mb-2 left-16 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                {mentionSuggestions.map((username, index) => (
                  <button
                    key={index}
                    onClick={() => selectMention(username)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 transition"
                  >
                    @{username}
                  </button>
                ))}
              </div>
            )}

            {/* Reply Preview */}
            {replyingTo && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-blue-50 border-l-4 border-blue-500 p-3 mx-4 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold">Replying to {replyingTo.username}</p>
                    <p className="text-sm text-gray-700 truncate">{replyingTo.content}</p>
                  </div>
                  <button
                    onClick={cancelReply}
                    className="text-gray-500 hover:text-gray-700 ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room Details Modal */}
      {showRoomDetails && (
        <RoomDetails
          socket={socket}
          roomName={currentRoom}
          currentUser={user}
          onClose={() => setShowRoomDetails(false)}
          onRoomDeleted={() => {
            setShowRoomDetails(false);
            handleRoomChange('general');
          }}
        />
      )}

      {/* Read Receipts Modal */}
      <ReadReceipts
        messageId={selectedMessageForReceipts}
        isOpen={showReadReceipts}
        onClose={() => {
          setShowReadReceipts(false);
          setSelectedMessageForReceipts(null);
        }}
        socket={socket}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        currentRoom={roomInfo}
        onMessageClick={handleSearchResultClick}
      />

      {/* Account Settings Modal */}
      {showAccountSettings && (
        <AccountSettings
          user={user}
          token={token}
          onClose={() => setShowAccountSettings(false)}
          onLogout={onLogout}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onReply={() => {
            setReplyingTo({
              id: contextMenu.message._id || contextMenu.message.id,
              username: contextMenu.message.username || contextMenu.message.user?.username,
              content: contextMenu.message.content
            });
          }}
          onReact={() => {
            setShowReactionPicker(contextMenu.message._id || contextMenu.message.id);
          }}
          onCopy={() => handleCopyMessage(contextMenu.message.content)}
          onDelete={() => {
            if (window.confirm('Are you sure you want to delete this message?')) {
              emit('message:delete', {
                messageId: contextMenu.message._id || contextMenu.message.id,
                room: currentRoom
              });
              toast.success('Message deleted');
            }
          }}
          canDelete={contextMenu.message.userId === user.userId || contextMenu.message.user?._id === user.userId}
        />
      )}

      {/* User Profile Card */}
      {hoveredUser && (
        <UserProfileCard
          userId={hoveredUser.userId}
          username={hoveredUser.username}
          x={profileCardPosition.x}
          y={profileCardPosition.y}
          onClose={() => setHoveredUser(null)}
          socket={socket}
        />
      )}
    </div>
  );
}
