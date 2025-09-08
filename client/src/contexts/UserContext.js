import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if there's a token in localStorage
        const token = localStorage.getItem('authToken');
        if (token) {
          // Verify token with server
          const response = await axios.get(`${config.SERVER_URL}/api/user`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } else {
          // Check if there's authentication data in sessionStorage (from another tab)
          const sessionAuth = sessionStorage.getItem('authData');
          if (sessionAuth) {
            const { userData, token: sessionToken } = JSON.parse(sessionAuth);
            setUser(userData);
            localStorage.setItem('authToken', sessionToken);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authData');
      } finally {
        setLoading(false);
      }
    };

    // Immediate check for existing auth (synchronous)
    const token = localStorage.getItem('authToken');
    if (token) {
      const sessionAuth = sessionStorage.getItem('authData');
      if (sessionAuth) {
        const { userData } = JSON.parse(sessionAuth);
        setUser(userData);
        setLoading(false);
        return; // Skip async check if we found auth data
      }
    }

    checkAuth();
  }, []);

  // Listen for storage changes (when other tabs login/logout)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'authToken') {
        if (e.newValue) {
          // Another tab logged in
          const sessionAuth = sessionStorage.getItem('authData');
          if (sessionAuth) {
            const { userData } = JSON.parse(sessionAuth);
            setUser(userData);
          }
        } else {
          // Another tab logged out
          setUser(null);
          sessionStorage.removeItem('authData');
        }
      }
    };

    // Check for existing authentication on tab focus (fallback)
    const handleFocus = () => {
      const token = localStorage.getItem('authToken');
      if (token && !user) {
        // Token exists but user is not set, try to restore
        const sessionAuth = sessionStorage.getItem('authData');
        if (sessionAuth) {
          const { userData } = JSON.parse(sessionAuth);
          setUser(userData);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // Listen for cross-tab authentication events
  useEffect(() => {
    // Use BroadcastChannel for cross-tab communication
    const channel = new BroadcastChannel('auth-channel');
    
    const handleMessage = (event) => {
      if (event.data.type === 'login') {
        setUser(event.data.userData);
        // Also update localStorage to persist across page refreshes
        localStorage.setItem('authToken', event.data.token);
        sessionStorage.setItem('authData', JSON.stringify({ 
          userData: event.data.userData, 
          token: event.data.token 
        }));
      } else if (event.data.type === 'logout') {
        setUser(null);
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authData');
      }
    };

    channel.addEventListener('message', handleMessage);
    
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('authToken', token);
    
    // Store in sessionStorage for cross-tab communication
    sessionStorage.setItem('authData', JSON.stringify({ userData, token }));
    
    // Trigger storage event for other tabs (this is the key!)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'authToken',
      newValue: token,
      oldValue: null,
      storageArea: localStorage
    }));
    
    // Also use BroadcastChannel as backup
    const channel = new BroadcastChannel('auth-channel');
    channel.postMessage({ type: 'login', userData, token });
    channel.close();
  };

  const logout = async () => {
    const token = localStorage.getItem('authToken');
    
    try {
      // Send logout request to blacklist the token
      if (token) {
        await fetch(`${config.SERVER_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Always clear local state regardless of server response
      setUser(null);
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authData');
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'authToken',
        newValue: null,
        oldValue: token,
        storageArea: localStorage
      }));
      
      // Also use BroadcastChannel as backup
      const channel = new BroadcastChannel('auth-channel');
      channel.postMessage({ type: 'logout' });
      channel.close();
      
      // Redirect to home page
      window.location.href = '/';
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};