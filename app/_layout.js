import 'react-native-get-random-values';  // for crypto.getRandomValues polyfill
import { Buffer } from 'buffer';

global.Buffer = Buffer;

import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';
import { SKIP_LOGIN, DEV_CERT_ID } from '@env';

// Import screens
import HomeScreen from './screens/HomeScreen';
import ScanScreen from './screens/ScanScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ScanResultScreen from './screens/ScanResultScreen';
import MeProfileScreen from './screens/MeProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginRegisterScreen from './screens/LoginRegisterScreen';
import { DefaultTheme } from '@react-navigation/native';
import CreateScreen from './screens/CreateScreen';
import { useAuth, AuthProvider } from '../contexts/AuthContext';
import { hasPrivateKey, loadPrivateKey } from '../services/privateKeyService';
import { checkCert } from '../services/certService';

const Stack = createNativeStackNavigator();

const TasTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFC107',
  }
}

function AppNavigator() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("LoginRegister");

  useEffect(() => {
    handleAutoLogin();
  }, []);

  const handleAutoLogin = async () => {
    try {
      console.log('Environment check:', { SKIP_LOGIN, DEV_CERT_ID });
      
      if (SKIP_LOGIN === 'true' && DEV_CERT_ID) {
        console.log('Development mode: attempting auto-login with cert ID:', DEV_CERT_ID);
        
        // 1. Check if we have the private key saved locally
        const hasKey = await hasPrivateKey(DEV_CERT_ID.trim());
        if (!hasKey) {
          console.log('No private key found for dev cert ID');
          setIsLoading(false);
          return;
        }

        // 2. Check if the certificate exists on the server
        const certExists = await checkCert(DEV_CERT_ID.trim());
        if (!certExists) {
          console.log('Dev certificate not found on server');
          setIsLoading(false);
          return;
        }

        // 3. Load the private key
        const privateKeyHex = await loadPrivateKey(DEV_CERT_ID.trim());
        if (!privateKeyHex) {
          console.log('Failed to load dev private key');
          setIsLoading(false);
          return;
        }

        // 4. Set global authentication state
        login(DEV_CERT_ID.trim(), privateKeyHex);
        setInitialRoute("Home");
        console.log('Auto-login successful');
      }
    } catch (error) {
      console.error('Auto-login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return null; // or a loading spinner component
  }

  return (
    <Stack.Navigator 
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Scan" component={ScanScreen} />
      <Stack.Screen name="LoginRegister" component={LoginRegisterScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} />
      <Stack.Screen name="MeProfile" component={MeProfileScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Create" component={CreateScreen}  />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark-content" />
          <AppNavigator />
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}