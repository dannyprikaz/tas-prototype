import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Text from '../components/text';
import { EventEmitter } from 'expo-modules-core';
import ScreenQRModule from '../../modules/screen-qr-module';

const emitter = new EventEmitter(ScreenQRModule);

emitter.addListener('onQRCodeDetected', ({ value }) => {

  console.log('✅ QR Code Detected:', value);
});

const ScanScreen = ({ navigation }) => {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={48} color="#D6C6FF" />
      </TouchableOpacity>

      <CameraView style={styles.camera} facing={facing}>
        <View style={styles.overlay}></View>
        <View style={styles.scanFrame}>
          <Svg width="340" height="232" viewBox="0 0 340 232" fill="none" xmlns="http://www.w3.org/2000/svg" style={styles.guides}>
            <Path fill-rule="evenodd" clip-rule="evenodd" d="M231 232C232.105 232 233 231.105 233 230L233 189C233 187.895 232.105 187 231 187L228.678 187C227.573 187 226.678 187.895 226.678 189L226.678 223.678C226.678 224.782 225.782 225.678 224.678 225.678L190 225.678C188.895 225.678 188 226.573 188 227.678L188 230C188 231.105 188.895 232 190 232L231 232Z" fill="#D6C6FF"/>
            <Path fill-rule="evenodd" clip-rule="evenodd" d="M107 230C107 231.105 107.895 232 109 232L150 232C151.105 232 152 231.105 152 230L152 227.678C152 226.573 151.105 225.678 150 225.678L115.322 225.678C114.218 225.678 113.322 224.782 113.322 223.678L113.322 189C113.322 187.895 112.427 187 111.322 187L109 187C107.895 187 107 187.895 107 189L107 230Z" fill="#D6C6FF"/>
            <Path fill-rule="evenodd" clip-rule="evenodd" d="M340 2.99999C340 1.89543 339.105 0.999995 338 0.999995L297 1C295.895 1 295 1.89543 295 3L295 5.32237C295 6.42694 295.895 7.32237 297 7.32237L331.678 7.32236C332.782 7.32236 333.678 8.2178 333.678 9.32236L333.678 44C333.678 45.1046 334.573 46 335.678 46L338 46C339.105 46 340 45.1046 340 44L340 2.99999Z" fill="#D6C6FF"/>
            <Path fill-rule="evenodd" clip-rule="evenodd" d="M338 127C339.105 127 340 126.105 340 125L340 84C340 82.8954 339.105 82 338 82L335.678 82C334.573 82 333.678 82.8954 333.678 84L333.678 118.678C333.678 119.782 332.782 120.678 331.678 120.678L297 120.678C295.895 120.678 295 121.573 295 122.678L295 125C295 126.105 295.895 127 297 127L338 127Z" fill="#D6C6FF"/>
            <Path fill-rule="evenodd" clip-rule="evenodd" d="M-3.87827e-06 124C-3.84316e-06 125.105 0.895424 126 2 126L43 126C44.1046 126 45 125.105 45 124L45 121.678C45 120.573 44.1046 119.678 43 119.678L8.32231 119.678C7.21774 119.678 6.32231 118.782 6.32231 117.678L6.32231 83C6.32231 81.8954 5.42688 81 4.32231 81L1.99999 81C0.895422 81 -5.21663e-06 81.8954 -5.18152e-06 83L-3.87827e-06 124Z" fill="#D6C6FF"/>
            <Path fill-rule="evenodd" clip-rule="evenodd" d="M2.00001 -3.55243e-06C0.895436 -3.69728e-06 5.78362e-06 0.895424 5.63877e-06 2L2.62268e-07 43C1.17422e-07 44.1046 0.895429 45 2 45L4.32237 45C5.42694 45 6.32237 44.1046 6.32237 43L6.32237 8.32231C6.32237 7.21774 7.2178 6.32232 8.32237 6.32232L43 6.32232C44.1046 6.32232 45 5.42689 45 4.32232L45 2C45 0.89543 44.1046 1.96892e-06 43 1.82407e-06L2.00001 -3.55243e-06Z" fill="#D6C6FF"/>
          </Svg>
        </View>
        <View style={styles.overlay}>
          <TouchableOpacity onPress={() => {
            try {
              console.log("Starting Broadcast")
              ScreenQRModule.startBroadcast();
            } catch (e) {
              console.error('🚨 Failed to start screen broadcast:', e);
            }
          }}>
            <MaterialIcons name="smartphone" size={48} color="#D6C6FF" />
          </TouchableOpacity>
        </View>
      </CameraView>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Who:</Text>
          <Text style={styles.infoValue}>Creator</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>What:</Text>
          <Text style={styles.infoValue}>Title</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Where:</Text>
          <Text style={styles.infoValue}>Location</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>When:</Text>
          <Text style={styles.infoValue}>Time</Text>
        </View>
      </View>
        
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
        >
          <Text style={styles.buttonText}>See Original</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('ScanResult')}
        >
          <Text style={styles.buttonText}>View More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202127',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    paddingBottom: 30,
    paddingRight: 15,
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  scanFrame: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guides: {
    opacity: 0.85,
  },
  tLogoFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFC107',
    backgroundColor: 'transparent',
  },
  infoContainer: {
    padding: 20,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row', 
    width: '60%',
    marginBottom: 5,
  },
  infoLabel: {
    width: 80,
    color: '#FFC107',
    flex: 1,
    fontSize: 20,
  },
  infoValue: {
    color: 'white',
    alignContent: 'flex-end',
    fontSize: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
  },
});

export default ScanScreen;