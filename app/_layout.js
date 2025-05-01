import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Import screens
import HomeScreen from './screens/HomeScreen';
import ScanScreen from './screens/ScanScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ScanResultScreen from './screens/ScanResultScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginRegisterScreen from './screens/LoginRegisterScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
        <StatusBar style="dark-content" />
        <Stack.Navigator 
          initialRouteName="LoginRegister"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Scan" component={ScanScreen} />
          <Stack.Screen name="LoginRegister" component={LoginRegisterScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ScanResult" component={ScanResultScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
    </SafeAreaProvider>
  );
}