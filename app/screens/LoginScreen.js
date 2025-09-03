import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert, 
  KeyboardAvoidingView, 
  ScrollView, 
  Platform,
  Keyboard,
  Dimensions
} from 'react-native';
import LoginHeader from '../components/loginHeader';
import Text from '../components/text';
import { hasPrivateKey, loadPrivateKey } from '../../services/privateKeyService';
import { checkCert } from '../../services/certService';
import { useAuth } from '../../contexts/AuthContext';

const { height: screenHeight } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [certId, setCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { login } = useAuth();
  const inputRef = useRef(null);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  const handleLogin = async () => {
    try {
      if (!certId.trim()) {
        Alert.alert('Error', 'Please enter a Certificate ID.');
        return;
      }

      setLoading(true);

      // 1. Check if we have the private key saved locally
      const hasKey = await hasPrivateKey(certId.trim());
      if (!hasKey) {
        Alert.alert('Error', 'No private key found for this Certificate ID. Please register first.');
        setLoading(false);
        return;
      }

      // 2. Check if the certificate exists on the server
      const certExists = await checkCert(certId.trim());
      if (!certExists) {
        Alert.alert('Error', 'Certificate not found on server. Please check your Certificate ID.');
        setLoading(false);
        return;
      }

      // 3. Load the private key
      const privateKeyHex = await loadPrivateKey(certId.trim());
      if (!privateKeyHex) {
        Alert.alert('Error', 'Failed to load private key.');
        setLoading(false);
        return;
      }

      // 4. Set global authentication state
      login(certId.trim(), privateKeyHex);

      // 5. IMPORTANT: Signal successful login to iOS for autofill
      if (Platform.OS === 'ios' && inputRef.current) {
        // Blur the input to trigger iOS "save password" prompt
        inputRef.current.blur();
        
        // Small delay to let iOS process the successful login
        setTimeout(() => {
          navigation.navigate('Home');
        }, 100);
      } else {
        navigation.navigate('Home');
      }

    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        
        if (error.response.status === 404) {
          Alert.alert('Error', 'Certificate not found. Please check your Certificate ID.');
        } else {
          Alert.alert('Error', 'Server error. Please try again later.');
        }
      } else if (error.request) {
        Alert.alert('Error', 'Network error. Please check your connection.');
      } else {
        Alert.alert('Error', error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            keyboardVisible && styles.scrollContentKeyboard
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <View style={styles.content}>
            <LoginHeader />
            
            <View style={styles.formContainer}>
              <Text style={styles.label}>Certificate ID</Text>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={certId}
                onChangeText={setCertId}
                placeholder="Enter your Certificate ID"
                autoCapitalize="characters"
                autoCorrect={false}
                // Enhanced iOS autofill integration
                textContentType="username"
                autoComplete="username"
                passwordRules=""
                keyboardType="default"
                returnKeyType="done"
                blurOnSubmit={false} // Changed to false so we control when to blur
                enablesReturnKeyAutomatically={true}
                onSubmitEditing={handleLogin} // Allow login via return key
              />
              
              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Authenticating...' : 'Login'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => navigation.navigate('LoginRegister')}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC107',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  scrollContentKeyboard: {
    paddingBottom: 50, // Only add padding when keyboard is visible
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  loginButtonText: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
  },
});

export default LoginScreen;