import { useState, useEffect, useRef, useCallback } from 'react';

function SearchModal({ isOpen, onClose, currentRoom, onMessageClick }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    username: '',
    roomId: currentRoom?._id || '',
    fileType: 'all',
    hasReactions: false,
    hasMentions: false,
    startDate: '',
    endDate: ''
  });

  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);
  const debounceTimeout = useRef(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (searchQuery.trim() || Object.values(filters).some(v => v && v !== 'all' && v !== false && v !== '')) {
        performSearch(0, true);
      } else {
        setResults([]);
        setTotal(0);
        setHasMore(false);
      }
    }, 300);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery, filters, isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const performSearch = async (skipCount = 0, reset = false) => {
    try {
      setIsLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (searchQuery.trim()) params.append('q', searchQuery);
      if (filters.username) params.append('username', filters.username);
      if (filters.roomId) params.append('roomId', filters.roomId);
      if (filters.fileType !== 'all') params.append('fileType', filters.fileType);
      if (filters.hasReactions) params.append('hasReactions', 'true');
      if (filters.hasMentions) params.append('hasMentions', 'true');
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '50');
      params.append('skip', skipCount.toString());

      const response = await fetch(`http://localhost:3000/api/messages/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      if (reset) {
        setResults(data.messages);
        setSkip(50);
      } else {
        setResults(prev => [...prev, ...data.messages]);
        setSkip(prev => prev + 50);
      }

      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      performSearch(skip, false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSkip(0);
  };

  const handleClearFilters = () => {
    setFilters({
      username: '',
      roomId: '',
      fileType: 'all',
      hasReactions: false,
      hasMentions: false,
      startDate: '',
      endDate: ''
    });
    setSearchQuery('');
    setResults([]);
    setTotal(0);
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={index} className="bg-yellow-200 font-semibold">{part}</mark> : 
        part
    );
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleResultClick = (message) => {
    onMessageClick(message);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col mx-2 sm:mx-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Search Messages</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Username Filter */}
            <input
              type="text"
              value={filters.username}
              onChange={(e) => handleFilterChange('username', e.target.value)}
              placeholder="Username"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* File Type Filter */}
            <select
              value={filters.fileType}
              onChange={(e) => handleFilterChange('fileType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="file">Files</option>
            </select>

            {/* Start Date */}
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* End Date */}
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Toggle Filters */}
          <div className="mt-3 flex items-center gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasReactions}
                onChange={(e) => handleFilterChange('hasReactions', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Has Reactions</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasMentions}
                onChange={(e) => handleFilterChange('hasMentions', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Has Mentions</span>
            </label>

            <button
              onClick={handleClearFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          </div>

          {/* Result Count */}
          {total > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              Found <span className="font-semibold">{total}</span> result{total !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="flex-1 overflow-y-auto p-4">
          {isLoading && results.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-700">{error}</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-700">No results found</p>
                <p className="text-sm text-gray-500 mt-1">Try different search terms or filters</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((message) => (
                <div
                  key={message._id}
                  onClick={() => handleResultClick(message)}
                  className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {message.user?.avatar ? (
                      <img
                        src={message.user.avatar}
                        alt={message.user.username}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {message.user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {message.user?.username || 'Unknown'}
                        </span>
                        {message.room && (
                          <span className="text-xs text-gray-500">
                            in #{message.room.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(message.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 break-words">
                        {highlightText(message.content, searchQuery)}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-2 mt-2">
                        {message.fileUrl && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            📎 {message.type === 'image' ? 'Image' : 'File'}
                          </span>
                        )}
                        {message.reactions && message.reactions.length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                            ❤️ {message.reactions.length}
                          </span>
                        )}
                        {message.replyTo && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            ↩️ Reply
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
