import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginForm() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const { login, register, loading, error } = useAuth();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (mode === 'login') {
        // Phase 2: Login with username/email and password
        await login(formData.username || formData.email, formData.password);
      } else {
        // Phase 2: Register new user
        await register(formData.username, formData.email, formData.password);
      }
    } catch (err) {
      console.error(`${mode} failed:`, err);
    }
  };

  const isFormValid = () => {
    if (mode === 'login') {
      return (formData.username.trim() || formData.email.trim()) && formData.password.trim();
    } else {
      return formData.username.trim() && formData.email.trim() && formData.password.trim();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            WebSocket Chat
          </h1>
          <p className="text-gray-600">
            {mode === 'login' ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'register'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          {(mode === 'register' || mode === 'login') && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username {mode === 'login' && <span className="text-gray-400">(or email)</span>}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Your username..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required={mode === 'register'}
                minLength={2}
                maxLength={20}
                disabled={loading}
              />
            </div>
          )}

          {/* Email Field (Registration only) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
                disabled={loading}
              />
            </div>
          )}

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
              minLength={6}
              disabled={loading}
            />
            {mode === 'register' && (
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm font-medium">{error}</p>
              {error.includes('Username already taken') && (
                <p className="text-xs mt-2">
                  💡 Try a different username or{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="underline font-semibold hover:text-red-800"
                  >
                    login with existing account
                  </button>
                </p>
              )}
              {error.includes('Invalid credentials') && (
                <p className="text-xs mt-2">
                  💡 Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="underline font-semibold hover:text-red-800"
                  >
                    Register here
                  </button>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (mode === 'login' ? 'Logging in...' : 'Creating account...') : (mode === 'login' ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Phase 2 - Production Ready WebSocket Chat</p>
        </div>
      </div>
    </div>
  );
}
