import React from "react";
import {
  CameraMode,
  CameraType,
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
} from "react-native";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import uuid from 'react-native-uuid';
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AddSignature from '../../modules/add-signature';

const CreateScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [photosPermission, requestPhotosPermission] = MediaLibrary.usePermissions();
  const ref = useRef(null);
  const [mode, setMode] = useState("video");
  const [facing, setFacing] = useState("back");
  const [recording, setRecording] = useState(false);

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

  const recordVideo = async () => {
    if (recording) {
      setRecording(false);
      ref.current?.stopRecording();
      return;
    }
    setRecording(true);
    const video = await ref.current?.recordAsync();
    try {
      const modifiedVideoUri = await AddSignature.addTextOverlayToVideo(video.uri, 'STANDIN SIGNATURE 2');
      console.log('Modified URI: ' + modifiedVideoUri);
      saveVideo({uri: modifiedVideoUri});
    } catch (err) {
      console.error('Failed to add text overlay:', err);
    }
  };

  const saveVideo = async (video) => {
    if (photosPermission?.status !== 'granted') {
        await requestPhotosPermission();
    }
    const asset = await MediaLibrary.createAssetAsync(video.uri);
    console.log(asset);
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const renderCamera = () => {
    return (
        <CameraView
            style={styles.camera}
            ref={ref}
            mode={mode}
            facing={facing}
            mute={false}
            responsiveOrientationWhenOrientationLocked
        >
            <SafeAreaView>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="close" size={48} color="#fff" />
                  </TouchableOpacity>
            </SafeAreaView>
            <View style={styles.shutterContainer}>
            <Pressable onPress={recordVideo}>
                {({ pressed }) => (
                <View
                    style={[
                    styles.shutterBtn,
                    {
                        opacity: pressed ? 0.5 : 1,
                    },
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
        </CameraView>
    );
  };

  return (
    <View style={styles.container}>
      {renderCamera()}
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
  shutterContainer: {
    position: "absolute",
    bottom: 44,
    left: 0,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
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