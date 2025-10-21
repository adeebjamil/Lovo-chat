import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function NotificationSettings() {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    soundEnabled: true,
    mentionOnly: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [browserPermission, setBrowserPermission] = useState('default');

  useEffect(() => {
    // Load settings from backend
    loadSettings();
    
    // Check browser notification permission
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('chatToken');
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user.notificationSettings) {
          setSettings(data.user.notificationSettings);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('chatToken');
      const response = await fetch(`${API_URL}/api/notifications/settings`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        // Also save to localStorage for immediate feedback
        localStorage.setItem('notificationSound', newSettings.soundEnabled);
        localStorage.setItem('notificationPush', newSettings.pushEnabled);
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      
      if (permission === 'granted') {
        // Send test notification
        new Notification('Notifications enabled!', {
          body: "You'll now receive notifications from LovoCard",
          icon: '/logo.png'
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Notification Settings
        </h3>
      </div>

      {/* Browser Push Notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Browser Notifications</h4>
            <p className="text-sm text-gray-600 mt-1">
              {browserPermission === 'granted' 
                ? 'Enabled - You will receive browser notifications'
                : browserPermission === 'denied'
                ? 'Blocked - Please enable in browser settings'
                : 'Not enabled - Click to enable'}
            </p>
          </div>
          
          {browserPermission === 'default' && (
            <button
              onClick={requestBrowserPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Enable
            </button>
          )}
          
          {browserPermission === 'granted' && (
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Push Notifications Toggle */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Enable Push Notifications</h4>
            <p className="text-sm text-gray-600 mt-1">
              Receive notifications for new messages and mentions
            </p>
          </div>
          <button
            onClick={() => handleToggle('pushEnabled')}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.pushEnabled ? 'bg-blue-600' : 'bg-gray-300'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.pushEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Sound Alerts Toggle */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Sound Alerts</h4>
            <p className="text-sm text-gray-600 mt-1">
              Play a sound when you receive a notification
            </p>
          </div>
          <button
            onClick={() => handleToggle('soundEnabled')}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Mention Only Mode */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Mentions Only</h4>
            <p className="text-sm text-gray-600 mt-1">
              Only receive notifications when someone @mentions you
            </p>
          </div>
          <button
            onClick={() => handleToggle('mentionOnly')}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.mentionOnly ? 'bg-blue-600' : 'bg-gray-300'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.mentionOnly ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">About Notifications</h4>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>• Browser notifications work even when the tab is not active</li>
              <li>• You can mute specific rooms from the room menu</li>
              <li>• Notifications are automatically cleared after 30 days</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
