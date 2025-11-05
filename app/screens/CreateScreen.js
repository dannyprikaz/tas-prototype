import React, { useRef, useState, useEffect } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
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
  Dimensions,
} from "react-native";
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as MediaLibrary from "expo-media-library";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import AddSignature from '../../modules/add-signature';
import elliptic from 'elliptic';
import Geohash from 'ngeohash';
import { useAuth } from "../../contexts/AuthContext";
import { SettingsModal, LOCATION_LEVELS, QR_COLOR_OPTIONS } from '../components/settingsModal';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

const DEV_CONTENT_XID = '9bsv0s37pdv002seao8g'.toUpperCase();

const CreateScreen = ({ navigation }) => {
  // Permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [photosPermission, requestPhotosPermission] = MediaLibrary.usePermissions();

  // Refs
  const cameraRef = useRef(null);
  const unsignedVideoRef = useRef(null);
  const signedVideoRef = useRef(null);

  // Camera state
  const [facing, setFacing] = useState("back");
  const [recording, setRecording] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [cameraKey, setCameraKey] = useState(0);

  // Video preview state
  const [showPreview, setShowPreview] = useState(false);
  const [unsignedVideoUri, setUnsignedVideoUri] = useState(null);
  const [signedVideoUri, setSignedVideoUri] = useState(null);
  const [signing, setSigning] = useState(false);
  const [savedPlaybackPosition, setSavedPlaybackPosition] = useState(0);
  const [signedVideoReady, setSignedVideoReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Settings state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [locationLevel, setLocationLevel] = useState(3);
  const [qrDarkColorId, setQrDarkColorId] = useState('black');
  const [qrLightColorId, setQrLightColorId] = useState('lightYellow');
  const [qrOpacity, setQrOpacity] = useState(1.0);

  // Gesture state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const { certId, privateKeyHex } = useAuth();

  // ========================================
  // VALIDATION FUNCTIONS
  // ========================================

  const validateAuthState = () => {
    if (!certId) {
      throw new Error('No certificate ID available - user not authenticated');
    }
    if (!privateKeyHex || privateKeyHex.length !== 64) {
      throw new Error('Invalid or missing private key');
    }
    if (!/^[0-9a-fA-F]+$/.test(privateKeyHex)) {
      throw new Error('Private key contains invalid hex characters');
    }
  };

  const validateEllipticKey = () => {
    try {
      const EC = elliptic.ec;
      const ec = new EC('p256');
      const key = ec.keyFromPrivate(privateKeyHex, 'hex');
      console.log('Elliptic key validated ✓');
      return key;
    } catch (error) {
      throw new Error(`Failed to create elliptic key: ${error.message}`);
    }
  };

  // ========================================
  // LOCATION FUNCTIONS
  // ========================================

  const getLocation = async () => {
    try {
      if (locationPermission?.status !== 'granted') {
        const result = await requestLocationPermission();
        if (result?.status !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      
      console.log('Location obtained:', location.coords.latitude, location.coords.longitude);
      return location;
    } catch (error) {
      throw new Error(`Failed to get location: ${error.message}`);
    }
  };

  const getCurrentLocationPrecision = () => {
    return LOCATION_LEVELS[locationLevel].precision;
  };

  // ========================================
  // SETTINGS HANDLERS
  // ========================================

  const openSettings = () => setSettingsVisible(true);
  const closeSettings = () => setSettingsVisible(false);

  const handleLocationLevelChange = (newLevel) => {
    setLocationLevel(newLevel);
    console.log(`Location precision: ${LOCATION_LEVELS[newLevel].name} (${LOCATION_LEVELS[newLevel].precision} chars)`);
  };

  const handleQrDarkColorChange = (newColorId) => {
    setQrDarkColorId(newColorId);
    const color = QR_COLOR_OPTIONS.find(c => c.id === newColorId);
    console.log(`QR dark color: ${color?.name}`);
  };

  const handleQrLightColorChange = (newColorId) => {
    setQrLightColorId(newColorId);
    const color = QR_COLOR_OPTIONS.find(c => c.id === newColorId);
    console.log(`QR light color: ${color?.name}`);
  };

  const handleQrOpacityChange = (newOpacity) => {
    setQrOpacity(newOpacity);
    console.log(`QR opacity: ${Math.round(newOpacity * 100)}%`);
  };

  // ========================================
  // VIDEO RECORDING
  // ========================================

  const recordVideo = async () => {
    try {
      validateAuthState();

      if (recording) {
        console.log('Stopping recording...');
        setRecording(false);
        cameraRef.current?.stopRecording();
        return;
      }

      console.log('Starting recording...');
      setRecording(true);

      const startTime = Math.floor(Date.now() / 1000);
      const location = await getLocation();
      const { latitude, longitude } = location.coords;

      const precision = getCurrentLocationPrecision();
      const geohash = Geohash.encode(latitude, longitude, precision);
      console.log(`Geohash (${LOCATION_LEVELS[locationLevel].name}):`, geohash);

      validateEllipticKey();

      const video = await cameraRef.current?.recordAsync();
      console.log('Recording completed:', video?.uri);

      if (!video?.uri) {
        throw new Error('No video URI returned from camera');
      }

      // Show preview immediately with unsigned video
      setUnsignedVideoUri(video.uri);
      setShowPreview(true);
      setSigning(true);
      setSavedPlaybackPosition(0);
      setSignedVideoReady(false);

      // Sign video in background
      signVideoInBackground(video.uri, startTime, geohash);

    } catch (err) {
      console.error("Recording failed:", err);
      Alert.alert('Error', `Recording failed: ${err.message}`);
      setRecording(false);
      setSigning(false);
    }
  };

  const signVideoInBackground = async (videoUri, startTime, geohash) => {
    try {
      console.log('Starting background video signing...');

      const modifiedVideoUri = await AddSignature.addQROverlayToVideo(
        videoUri,
        startTime,
        privateKeyHex,
        certId,
        DEV_CONTENT_XID,
        geohash.toUpperCase(),
        {
          darkColor: QR_COLOR_OPTIONS.find(c => c.id === qrDarkColorId)?.color,
          lightColor: QR_COLOR_OPTIONS.find(c => c.id === qrLightColorId)?.color,
          opacity: qrOpacity
        }
      );

      console.log("Video signing completed ✓");

      // Ensure proper file:// scheme
      let normalizedUri = modifiedVideoUri;
      if (!normalizedUri.startsWith('file://')) {
        normalizedUri = 'file://' + modifiedVideoUri;
      }

      // Verify signed video exists
      const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
      if (!fileInfo.exists) {
        throw new Error('Signed video file does not exist');
      }
      console.log('Signed video verified:', fileInfo.size, 'bytes');

      setSignedVideoUri(normalizedUri);
      setSigning(false);

    } catch (error) {
      console.error("Video signing failed:", error);
      setSigning(false);
      Alert.alert(
        'Signing Failed',
        'The video was recorded but could not be signed. You can still save the unsigned version.',
        [{ text: 'OK' }]
      );
    }
  };

  // ========================================
  // VIDEO PREVIEW HANDLERS
  // ========================================

  const handlePlaybackStatusUpdate = (status) => {
    if (!status.isLoaded || signedVideoReady) return;
    if (status.positionMillis) {
      setSavedPlaybackPosition(status.positionMillis);
    }
  };

  const waitForSigning = () => {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!signing) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  };

  const handleSaveVideo = async () => {
    try {
      // Wait if signing still in progress
      if (signing) {
        console.log('Waiting for signing to complete...');
        Alert.alert('Processing', 'Finishing video signature...', [], { cancelable: false });
        await waitForSigning();
      }

      const videoToSave = signedVideoUri || unsignedVideoUri;
      if (!videoToSave) {
        throw new Error('No video available to save');
      }

      console.log('Saving:', signedVideoUri ? 'signed' : 'unsigned', 'version');
      await saveVideo({ uri: videoToSave });

      Alert.alert(
        'Success',
        `Video saved successfully!${signedVideoUri ? ' (Signed)' : ' (Unsigned)'}`,
        [{ text: 'OK', onPress: handleDiscardVideo }]
      );

    } catch (error) {
      console.error("Error saving video:", error);
      Alert.alert('Error', 'Failed to save video to photo library');
    }
  };

  const handleDiscardVideo = async () => {
    console.log('Discarding video...');

    // Clean up video refs
    if (unsignedVideoRef?.current) {
      try {
        await unsignedVideoRef.current.stopAsync();
        await unsignedVideoRef.current.unloadAsync();
      } catch (e) {
        console.log('Unsigned video cleanup error:', e.message);
      }
    }

    if (signedVideoRef?.current) {
      try {
        await signedVideoRef.current.stopAsync();
        await signedVideoRef.current.unloadAsync();
      } catch (e) {
        console.log('Signed video cleanup error:', e.message);
      }
    }
  
    // Force camera remount
    setCameraKey(prev => prev + 1);

    // Reset state
    setShowPreview(false);
    setUnsignedVideoUri(null);
    setSignedVideoUri(null);
    setSigning(false);
    setSavedPlaybackPosition(0);
    setSignedVideoReady(false);
  };

  const saveVideo = async (video) => {
    try {
      if (photosPermission?.status !== 'granted') {
        const result = await requestPhotosPermission();
        if (result?.status !== 'granted') {
          throw new Error('Photos permission not granted');
        }
      }

      const asset = await MediaLibrary.createAssetAsync(video.uri);
      console.log('Asset created:', asset.id);
      return asset;
    } catch (error) {
      console.error('Save video error:', error);
      throw error;
    }
  };

  // ========================================
  // CAMERA CONTROLS
  // ========================================

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      'worklet';
      const newScale = Math.max(1, Math.min(savedScale.value * e.scale, 3));
      scale.value = newScale;
      const zoomValue = Math.max(0, Math.min((newScale - 1) / 2, 1));
      runOnJS(setZoom)(zoomValue);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
    });

  // ========================================
  // DUMMY QR OVERLAY COMPONENT
  // ========================================

  const DummyQROverlay = () => {
    const { width: screenWidth } = Dimensions.get('window');
    const qrSize = screenWidth * 0.122
    const padding = 9;

    return (
      <View style={styles.dummyQRContainer} pointerEvents="none">
        {/* Time */}
        <View style={[styles.dummyQR, {
          left: padding,
          bottom: padding + qrSize,
          width: qrSize,
          height: qrSize,
        }]}>
          <Text style={[styles.dummyQRLabel, { fontSize: qrSize * 0.3 }]}>T</Text>
        </View>

        {/* Content */}
        <View style={[styles.dummyQR, {
          left: padding + qrSize,
          bottom: padding + qrSize,
          width: qrSize,
          height: qrSize,
        }]}>
          <Text style={[styles.dummyQRLabel, { fontSize: qrSize * 0.3 }]}>C</Text>
        </View>

        {/* Location */}
        <View style={[styles.dummyQR, {
          left: padding + 2 * qrSize,
          bottom: padding + qrSize,
          width: qrSize,
          height: qrSize,
        }]}>
          <Text style={[styles.dummyQRLabel, { fontSize: qrSize * 0.3 }]}>L</Text>
        </View>

        {/* Identity */}
        <View style={[styles.dummyQR, {
          left: padding + qrSize,
          bottom: padding,
          width: qrSize,
          height: qrSize,
        }]}>
          <Text style={[styles.dummyQRLabel, { fontSize: qrSize * 0.3 }]}>I</Text>
        </View>
      </View>
    );
  };

  // ========================================
  // PERMISSION CHECK
  // ========================================

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

  // ========================================
  // PREVIEW SCREEN
  // ========================================

  if (showPreview) {
    return (
      <View style={styles.container}>
        <View style={styles.cameraContainer}>
          {/* Unsigned video - visible until signed is ready */}
          {unsignedVideoUri && (
            <Video
              ref={unsignedVideoRef}
              source={{ uri: unsignedVideoUri }}
              style={[
                styles.camera,
                signedVideoReady
                  ? styles.hiddenVideo
                  : transitioning
                  ? styles.fadingVideo
                  : styles.visibleVideo
              ]}
              useNativeControls={!signedVideoReady}
              resizeMode="cover"
              shouldPlay={!signedVideoReady}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onLoad={() => console.log('✓ Unsigned video loaded')}
            />
          )}

          {/* Signed video - loaded in background, shown when ready */}
          {signedVideoUri && (
            <Video
              ref={signedVideoRef}
              source={{ uri: signedVideoUri }}
              style={[
                styles.camera,
                !signedVideoReady && !transitioning ? styles.hiddenVideo : styles.visibleVideo
              ]}
              resizeMode="cover"
              isLooping
              shouldPlay={signedVideoReady}
              onLoad={async () => {
                console.log('✓ Signed video loaded');
                try {
                  if (savedPlaybackPosition > 0 && signedVideoRef.current) {
                    await signedVideoRef.current.setPositionAsync(savedPlaybackPosition);
                  }
                  setTransitioning(true);
                  await new Promise(resolve => setTimeout(resolve, 150));
                  setSignedVideoReady(true);
                  setTransitioning(false);
                  console.log('✓ Signed video ready');
                } catch (e) {
                  console.error('Failed to position signed video:', e);
                  setSignedVideoReady(true);
                }
              }}
              onError={(error) => {
                console.error('❌ Signed video error:', error);
                setSignedVideoReady(true);
              }}
            />
          )}

          {/* Dummy QR overlay - only show when video is unsigned */}
          {!signedVideoReady && <DummyQROverlay />}

          {/* Signing indicator */}
          {signing && (
            <View style={styles.signingIndicator}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.signingText}>Signing video...</Text>
            </View>
          )}
        </View>

        {/* Top Bar */}
        <SafeAreaView style={styles.topControls}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDiscardVideo}
          >
            <Ionicons name="close" size={48} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Bottom Bar */}
        <View style={styles.previewControls}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={handleDiscardVideo}
          >
            <Text style={styles.previewButtonText}>Discard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.previewButton, styles.saveButton]}
            onPress={handleSaveVideo}
          >
            <Text style={[styles.previewButtonText, styles.saveButtonText]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ========================================
  // MAIN CAMERA SCREEN
  // ========================================

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <GestureDetector gesture={pinchGesture}>
          <CameraView
            key={cameraKey}
            style={styles.camera}
            ref={cameraRef}
            mode="video"
            facing={facing}
            mute={false}
            zoom={zoom}
            responsiveOrientationWhenOrientationLocked
          />
        </GestureDetector>
        </View>

        {/* Dummy QR overlay */}
        <DummyQROverlay />

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
        <Text style={styles.debugText}>
          Location: {LOCATION_LEVELS[locationLevel].name} ({getCurrentLocationPrecision()} chars)
        </Text>
        <Text style={styles.debugText}>
          QR: {QR_COLOR_OPTIONS.find(c => c.id === qrDarkColorId)?.name}/{QR_COLOR_OPTIONS.find(c => c.id === qrLightColorId)?.name} @ {Math.round(qrOpacity * 100)}%
        </Text>
      </View>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsVisible}
        onClose={closeSettings}
        locationLevel={locationLevel}
        onLocationLevelChange={handleLocationLevelChange}
        qrDarkColorId={qrDarkColorId}
        onQrDarkColorChange={handleQrDarkColorChange}
        qrLightColorId={qrLightColorId}
        onQrLightColorChange={handleQrLightColorChange}
        qrOpacity={qrOpacity}
        onQrOpacityChange={handleQrOpacityChange}
      />

      {/* Bottom Bar */}
      <View style={styles.shutterContainer}>
        <Pressable onPress={openSettings}>
          <FontAwesome6 name="gear" size={32} color="white" />
        </Pressable>

        <Pressable onPress={recordVideo}>
          {({ pressed }) => (
            <View style={[styles.shutterBtn, { opacity: pressed ? 0.5 : 1 }]}>
              <View
                style={[
                  recording ? styles.shutterBtnInnerStop : styles.shutterBtnInnerStart,
                  { backgroundColor: "red" },
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraContainer: {
    flex: 1,
    width: "100%",
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  hiddenVideo: {
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    backgroundColor: "black",
  },
  visibleVideo: {
    opacity: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    backgroundColor: "black",
  },
  fadingVideo: {
    opacity: 0.5,
    backgroundColor: "transparent",
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
  dummyQRContainer: {
    position: 'absolute',
    top: 0,
    left: -42,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  dummyQR: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dummyQRLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.7)',
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
  signingIndicator: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    zIndex: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewControls: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  previewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  saveButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
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