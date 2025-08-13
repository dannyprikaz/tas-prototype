import React from "react";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useRef, useState } from "react";
import {
    Button,
    Pressable,
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from "expo-media-library";
import * as Location from "expo-location";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AddSignature from '../../modules/add-signature';
import elliptic from 'elliptic';
import Geohash from 'ngeohash';
import { useAuth } from "../../contexts/AuthContext";

const CreateScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [ locationPermission, requestLocationPermission ] = Location.useForegroundPermissions();
  const [photosPermission, requestPhotosPermission] = MediaLibrary.usePermissions();
  const ref = useRef(null);
  const [mode, setMode] = useState("video");
  const [facing, setFacing] = useState("back");
  const [recording, setRecording] = useState(false);
  const [signing, setSigning] = useState(false);
  
  const devContentXID = '9bsv0s37pdv002seao8g'.toUpperCase();

  const { certId, privateKeyHex } = useAuth();

  // Validation function to check auth state
  const validateAuthState = () => {
    console.log('=== AUTH VALIDATION ===');
    console.log('certId:', certId);
    console.log('privateKeyHex length:', privateKeyHex ? privateKeyHex.length : 'null');
    console.log('privateKeyHex first 10 chars:', privateKeyHex ? privateKeyHex.substring(0, 10) : 'null');
    
    if (!certId) {
      throw new Error('No certificate ID available - user not authenticated');
    }
    if (!privateKeyHex) {
      throw new Error('No private key available - user not authenticated');
    }
    if (privateKeyHex.length !== 64) {
      throw new Error(`Invalid private key length: ${privateKeyHex.length}, expected 64`);
    }
    
    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(privateKeyHex)) {
      throw new Error('Private key contains invalid hex characters');
    }
    
    console.log('Auth validation passed ✓');
  };

  // Validation function for elliptic key
  const validateEllipticKey = () => {
    try {
      console.log('=== ELLIPTIC KEY VALIDATION ===');
      const EC = elliptic.ec;
      const ec = new EC('p256');
      const key = ec.keyFromPrivate(privateKeyHex, 'hex');
      
      console.log('Elliptic key created successfully ✓');
      console.log('Public key:', key.getPublic('hex').substring(0, 20) + '...');
      
      return key;
    } catch (error) {
      console.error('Elliptic key validation failed:', error);
      throw new Error(`Failed to create elliptic key: ${error.message}`);
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to use the camera
        </Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  const getLocation = async () => {
    try {
      console.log('=== LOCATION REQUEST ===');
      if (locationPermission?.status !== 'granted') {
        console.log('Requesting location permission...');
        const result = await requestLocationPermission();
        console.log('Location permission result:', result);
      }
      
      console.log('Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      console.log('Location obtained:', location.coords.latitude, location.coords.longitude);
      return location;
    } catch (error) {
      console.error('Location error:', error);
      throw new Error(`Failed to get location: ${error.message}`);
    }
  };

  const recordVideo = async () => {
    try {
      console.log('\n=== STARTING VIDEO RECORDING ===');
      
      // Validate authentication state first
      validateAuthState();
      
      if (recording) {
        console.log('Stopping recording...');
        setRecording(false);
        ref.current?.stopRecording();
        return;
      }

      console.log('Starting recording process...');
      setRecording(true);
      
      const startTime = Math.floor(Date.now() / 1000);
      console.log('Start time:', startTime);
      
      // Get location with error handling
      const location = await getLocation();
      const { latitude, longitude } = location.coords;
      const geohash = Geohash.encode(latitude, longitude, 4);
      console.log('Geohash:', geohash);
      
      // Validate elliptic key before recording
      validateEllipticKey();
      
      console.log('Starting camera recording...');
      const video = await ref.current?.recordAsync();
      console.log('Recording completed, video URI:', video?.uri);
      
      if (!video?.uri) {
        throw new Error('No video URI returned from camera');
      }
      
      setSigning(true);
      console.log('\n=== STARTING VIDEO SIGNING ===');

      // Add slight delay to ensure UI updates
      setTimeout(async () => {
        try {
          console.log('Calling AddSignature.addQROverlayToVideo with params:');
          console.log('- videoUri:', video.uri);
          console.log('- startTime:', startTime);
          console.log('- privateKeyHex length:', privateKeyHex.length);
          console.log('- certId:', certId);
          console.log('- contentXID:', devContentXID);
          console.log('- geohash:', geohash.toUpperCase());
          
          const modifiedVideoUri = await AddSignature.addQROverlayToVideo(
            video.uri,
            startTime,
            privateKeyHex,
            certId,
            devContentXID,
            geohash.toUpperCase()
          );
          
          console.log("✓ Video signing completed successfully");
          console.log("Modified video URI:", modifiedVideoUri);

          try {
            console.log('\n=== SAVING VIDEO ===');
            await saveVideo({ uri: modifiedVideoUri });
            console.log("✓ Video saved successfully");
            
            Alert.alert(
              'Success', 
              'Video recorded and signed successfully!',
              [{ text: 'OK', onPress: () => console.log('User acknowledged success') }]
            );
            
          } catch (saveErr) {
            console.error("❌ Error saving video:", saveErr);
            Alert.alert('Warning', 'Video was signed but failed to save to photo library');
          }

        } catch (signErr) {
          console.error("❌ Video signing failed:", signErr);
          console.error("Error details:", {
            name: signErr.name,
            message: signErr.message,
            stack: signErr.stack,
            cause: signErr.cause
          });
          
          Alert.alert(
            'Error', 
            `Failed to sign video: ${signErr.message}`,
            [{ text: 'OK', onPress: () => console.log('User acknowledged error') }]
          );
        } finally {
          setSigning(false);
        }
      }, 100); // Small delay to ensure UI updates
      
    } catch (err) {
      console.error("❌ Recording process failed:", err);
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      
      Alert.alert(
        'Error', 
        `Recording failed: ${err.message}`,
        [{ text: 'OK', onPress: () => console.log('User acknowledged recording error') }]
      );
      
      setRecording(false);
      setSigning(false);
    }
  };

  const saveVideo = async (video) => {
    try {
      console.log('Checking photos permission...');
      if (photosPermission?.status !== 'granted') {
        console.log('Requesting photos permission...');
        const result = await requestPhotosPermission();
        console.log('Photos permission result:', result);
      }
      
      console.log('Creating media library asset...');
      const asset = await MediaLibrary.createAssetAsync(video.uri);
      console.log('Asset created:', asset.id);
      return asset;
    } catch (error) {
      console.error('Save video error:', error);
      throw error;
    }
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        ref={ref}
        mode={mode}
        facing={facing}
        mute={false}
        responsiveOrientationWhenOrientationLocked
      />
      
      {/* Top Bar */}
      <SafeAreaView style={styles.topControls}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={48} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Debug Info Overlay */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Auth: {certId ? '✓' : '❌'} | Key: {privateKeyHex ? '✓' : '❌'}
        </Text>
      </View>

      {/* Signing Modal */}
      {signing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Signing video...</Text>
          <Text style={styles.overlaySubText}>This may take a moment</Text>
        </View>
      )}

      {/* Bottom Bar */}
      <View style={styles.shutterContainer}>
        <Pressable>
          <FontAwesome6 name="gear" size={32} color="white" />
        </Pressable>
        <Pressable onPress={recordVideo}>
          {({ pressed }) => (
            <View
              style={[
                styles.shutterBtn,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <View
                style={[
                  recording ? styles.shutterBtnInnerStop : styles.shutterBtnInnerStart,
                  {
                    backgroundColor: mode === "picture" ? "white" : "red",
                  },
                ]}
              />
            </View>
          )}
        </Pressable>

        <Pressable onPress={toggleFacing}>
          <FontAwesome6 name="rotate-left" size={32} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  closeButton: {
    paddingBottom: 30,
    paddingRight: 15,
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  debugInfo: {
    position: "absolute",
    top: 100,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 15,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayText: {
    color: 'white',
    fontSize: 18,
    marginTop: 10,
  },
  overlaySubText: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
    opacity: 0.7,
  },
  shutterContainer: {
    position: "absolute",
    bottom: 44,
    left: 0,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    zIndex: 10,
  },
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 5,
    borderColor: "white",
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInnerStart: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  shutterBtnInnerStop: {
    width: 40,
    height: 40,
    borderRadius: 5,
  },
});

export default CreateScreen;