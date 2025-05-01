import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Text from '../components/text';
import LoginHeader from '../components/loginHeader';

const LoginRegisterScreen = ({ navigation }) => {

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <LoginHeader></LoginHeader>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
          >
          <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register')}
          >
          <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC107',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
  buttonContainer: {
    marginTop: 80,
    flex: 1,
    justifyContent: 'flex-start',
  },
  loginButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 40,
  },
  loginButtonText: {
    color: '#FFC107',
    fontSize: 20,
    fontWeight: 'bold',
  },
  registerButton: {
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 20,
  },
});

export default LoginRegisterScreen;