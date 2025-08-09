import 'react-native-get-random-values';  // for crypto.getRandomValues polyfill
import { Buffer } from 'buffer';

global.Buffer = Buffer;

import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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
import { AuthProvider } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

const TasTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFC107',
  }
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
          <StatusBar style="dark-content" />
          <Stack.Navigator 
            initialRouteName="LoginRegister"
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
      </SafeAreaProvider>
    </AuthProvider>
  );
}