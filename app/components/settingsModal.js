import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Location specificity levels with corresponding geohash precision
const LOCATION_LEVELS = [
  { level: 0, name: 'Continent', precision: 1, description: 'Continental level (~5,000 km)' },
  { level: 1, name: 'Country', precision: 2, description: 'Country level (~1,250 km)' },
  { level: 2, name: 'State', precision: 3, description: 'State/Region level (~156 km)' },
  { level: 3, name: 'County', precision: 4, description: 'County level (~39 km)' },
  { level: 4, name: 'City', precision: 5, description: 'City level (~5 km)' },
  { level: 5, name: 'Neighborhood', precision: 6, description: 'Neighborhood level (~1.2 km)' },
  { level: 6, name: 'Street', precision: 7, description: 'Street level (~153 m)' },
  { level: 7, name: 'Address', precision: 8, description: 'Address level (~38 m)' },
];

// QR Code color options
const QR_COLOR_OPTIONS = [
  // Dark colors
  { id: 'black', name: 'Black', color: '#000000', isDark: true },
  { id: 'darkBlue', name: 'Dark Blue', color: '#1a237e', isDark: true },
  { id: 'darkGreen', name: 'Dark Green', color: '#1b5e20', isDark: true },
  { id: 'darkRed', name: 'Dark Red', color: '#b71c1c', isDark: true },
  { id: 'darkPurple', name: 'Dark Purple', color: '#4a148c', isDark: true },
  // Light colors  
  { id: 'white', name: 'White', color: '#ffffff', isDark: false },
  { id: 'lightGray', name: 'Light Gray', color: '#e0e0e0', isDark: false },
  { id: 'lightBlue', name: 'Light Blue', color: '#bbdefb', isDark: false },
  { id: 'lightGreen', name: 'Light Green', color: '#c8e6c9', isDark: false },
  { id: 'lightYellow', name: 'Light Yellow', color: '#fff9c4', isDark: false },
];

const SettingsModal = ({ visible, onClose, locationLevel, onLocationLevelChange, qrDarkColorId, onQrDarkColorChange, qrLightColorId, onQrLightColorChange, qrOpacity, onQrOpacityChange }) => {
  const [tempLocationLevel, setTempLocationLevel] = useState(locationLevel);
  const [tempQrDarkColorId, setTempQrDarkColorId] = useState(qrDarkColorId);
  const [tempQrLightColorId, setTempQrLightColorId] = useState(qrLightColorId);
  const [tempQrOpacity, setTempQrOpacity] = useState(qrOpacity);

  const handleSave = () => {
    onLocationLevelChange(tempLocationLevel);
    onQrDarkColorChange(tempQrDarkColorId);
    onQrLightColorChange(tempQrLightColorId);
    onQrOpacityChange(tempQrOpacity);
    onClose();
  };

  const handleCancel = () => {
    setTempLocationLevel(locationLevel);
    setTempQrDarkColorId(qrDarkColorId);
    setTempQrLightColorId(qrLightColorId);
    setTempQrOpacity(qrOpacity);
    onClose();
  };

  const currentLevel = LOCATION_LEVELS[tempLocationLevel];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Location Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Privacy</Text>
            <Text style={styles.sectionDescription}>
              Control how specific location information is included in your video signatures.
            </Text>

            {/* Current Setting Display */}
            <View style={styles.currentSetting}>
              <Text style={styles.currentLabel}>Current Setting:</Text>
              <Text style={styles.currentValue}>{currentLevel.name}</Text>
              <Text style={styles.currentDescription}>{currentLevel.description}</Text>
              <Text style={styles.technicalInfo}>
                Geohash precision: {currentLevel.precision} characters
              </Text>
            </View>

            {/* Slider */}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Privacy Level</Text>
              <View style={styles.sliderWrapper}>
                <Text style={styles.sliderExtreme}>More Private</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={LOCATION_LEVELS.length - 1}
                  step={1}
                  value={tempLocationLevel}
                  onValueChange={setTempLocationLevel}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#E5E5E5"
                  thumbStyle={styles.thumb}
                />
                <Text style={styles.sliderExtreme}>Less Private</Text>
              </View>
            </View>

            {/* Level Indicators */}
            <View style={styles.levelIndicators}>
              {LOCATION_LEVELS.map((level, index) => (
                <TouchableOpacity
                  key={level.level}
                  style={[
                    styles.levelIndicator,
                    tempLocationLevel === index && styles.levelIndicatorActive
                  ]}
                  onPress={() => setTempLocationLevel(index)}
                >
                  <Text style={[
                    styles.levelName,
                    tempLocationLevel === index && styles.levelNameActive
                  ]}>
                    {level.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* QR Code Appearance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QR Code Appearance</Text>
            <Text style={styles.sectionDescription}>
              Customize how QR codes appear on your signed videos.
            </Text>

            {/* QR Color Selection */}
            <View style={styles.colorSection}>
              <Text style={styles.sliderLabel}>QR Code Colors</Text>
              <Text style={styles.sectionDescription}>
                Select one dark color (foreground) and one light color (background) for your QR codes.
              </Text>
              
              {/* Dark Colors */}
              <Text style={styles.colorGroupLabel}>Foreground (Dark) Color</Text>
              <View style={styles.colorGrid}>
                {QR_COLOR_OPTIONS.filter(color => color.isDark).map((color) => (
                  <TouchableOpacity
                    key={color.id}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.color },
                      tempQrDarkColorId === color.id && styles.colorOptionSelected
                    ]}
                    onPress={() => setTempQrDarkColorId(color.id)}
                  >
                    {tempQrDarkColorId === color.id && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Light Colors */}
              <Text style={styles.colorGroupLabel}>Background (Light) Color</Text>
              <View style={styles.colorGrid}>
                {QR_COLOR_OPTIONS.filter(color => !color.isDark).map((color) => (
                  <TouchableOpacity
                    key={color.id}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.color, borderWidth: 1, borderColor: '#ddd' },
                      tempQrLightColorId === color.id && styles.colorOptionSelected
                    ]}
                    onPress={() => setTempQrLightColorId(color.id)}
                  >
                    {tempQrLightColorId === color.id && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Selected Colors Display */}
              <View style={styles.selectedColorsDisplay}>
                <View style={styles.selectedColorRow}>
                  <Text style={styles.currentLabel}>Foreground:</Text>
                  <Text style={styles.currentValue}>
                    {QR_COLOR_OPTIONS.find(c => c.id === tempQrDarkColorId)?.name || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.selectedColorRow}>
                  <Text style={styles.currentLabel}>Background:</Text>
                  <Text style={styles.currentValue}>
                    {QR_COLOR_OPTIONS.find(c => c.id === tempQrLightColorId)?.name || 'Unknown'}
                  </Text>
                </View>
                
                {/* Color Preview */}
                <View style={styles.colorPreview}>
                  <View style={[
                    styles.qrPreviewSquare,
                    { 
                      backgroundColor: QR_COLOR_OPTIONS.find(c => c.id === tempQrLightColorId)?.color || '#ffffff'
                    }
                  ]}>
                    <View style={[
                      styles.qrPreviewPattern,
                      { 
                        backgroundColor: QR_COLOR_OPTIONS.find(c => c.id === tempQrDarkColorId)?.color || '#000000'
                      }
                    ]} />
                  </View>
                  <Text style={styles.previewLabel}>QR Preview</Text>
                </View>
              </View>
            </View>

            {/* QR Opacity Slider */}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>QR Code Opacity</Text>
              <View style={styles.sliderWrapper}>
                <Text style={styles.sliderExtreme}>80%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.8}
                  maximumValue={1.0}
                  step={0.05}
                  value={tempQrOpacity}
                  onValueChange={setTempQrOpacity}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#E5E5E5"
                  thumbStyle={styles.thumb}
                />
                <Text style={styles.sliderExtreme}>100%</Text>
              </View>
              <View style={styles.opacityDisplay}>
                <Text style={styles.currentLabel}>Current:</Text>
                <Text style={styles.currentValue}>{Math.round(tempQrOpacity * 100)}%</Text>
              </View>
            </View>
          </View>

          {/* Privacy Information */}
          <View style={styles.privacyInfo}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.privacyText}>
              Lower precision settings provide more privacy by sharing less specific location data. 
              QR code appearance settings only affect the visual presentation and don't impact security.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  currentSetting: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  currentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  currentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  technicalInfo: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 12,
  },
  sliderWrapper: {
    alignItems: 'center',
  },
  slider: {
    width: width - 32,
    height: 40,
    marginVertical: 8,
  },
  sliderExtreme: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 16,
  },
  thumb: {
    backgroundColor: '#007AFF',
    width: 24,
    height: 24,
  },
  levelIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  levelIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    minWidth: (width - 48) / 4 - 4,
    alignItems: 'center',
  },
  levelIndicatorActive: {
    backgroundColor: '#007AFF',
  },
  levelName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  levelNameActive: {
    color: '#fff',
    fontWeight: '500',
  },
  colorSection: {
    marginBottom: 24,
  },
  colorGroupLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  selectedColorsDisplay: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  selectedColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorPreview: {
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  qrPreviewSquare: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  qrPreviewPattern: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  opacityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export { SettingsModal, LOCATION_LEVELS, QR_COLOR_OPTIONS };