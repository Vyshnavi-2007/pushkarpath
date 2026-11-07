import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';
import { disconnectSocket } from './socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('pushkarpath_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('pushkarpath_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If token exists, verify current session
    if (token) {
      api.auth.getMe()
        .then((res) => {
          if (res && res.user) {
            setUser(res.user);
            sessionStorage.setItem('pushkarpath_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          // If token invalid or me endpoint not implemented, keep existing parsed user if valid
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const loginPilgrim = async (phone, otp) => {
    const res = await api.auth.verifyOtp(phone, otp);
    const authToken = res.token;
    const authUser = res.user || { phone, role: 'user', name: `Pilgrim (${phone.slice(-4)})` };

    sessionStorage.setItem('pushkarpath_token', authToken);
    sessionStorage.setItem('pushkarpath_user', JSON.stringify(authUser));

    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const loginStaff = async (staffId, passcode) => {
    const res = await api.auth.staffLogin(staffId, passcode);
    const authToken = res.token;
    const authUser = res.user;

    sessionStorage.setItem('pushkarpath_token', authToken);
    sessionStorage.setItem('pushkarpath_user', JSON.stringify(authUser));

    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const logout = () => {
    sessionStorage.removeItem('pushkarpath_token');
    sessionStorage.removeItem('pushkarpath_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const value = {
    token,
    user,
    role: user?.role || 'guest',
    kind: user?.kind || null,
    isAuthenticated: !!token && !!user,
    loading,
    loginPilgrim,
    loginStaff,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
