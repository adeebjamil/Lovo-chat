import { useState } from 'react';

function SearchBar({ onSearchClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onSearchClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full transition-colors"
      aria-label="Search messages"
      title="Search messages (Ctrl+K)"
    >
      <svg
        className="w-6 h-6"
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

      {/* Keyboard shortcut hint */}
      {isHovered && (
        <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          Ctrl+K
        </div>
      )}
    </button>
  );
}

export default SearchBar;
