import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [certId, setCertId] = useState(null);
  const [privateKeyHex, setPrivateKeyHex] = useState(null);

  const login = (certId, privateKeyHex) => {
    setIsAuthenticated(true);
    setCertId(certId);
    setPrivateKeyHex(privateKeyHex);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCertId(null);
    setPrivateKeyHex(null);
  };

  const value = {
    isAuthenticated,
    certId,
    privateKeyHex,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};