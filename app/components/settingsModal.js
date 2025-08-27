import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
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

const SettingsModal = ({ visible, onClose, locationLevel, onLocationLevelChange }) => {
  const [tempLocationLevel, setTempLocationLevel] = useState(locationLevel);

  const handleSave = () => {
    onLocationLevelChange(tempLocationLevel);
    onClose();
  };

  const handleCancel = () => {
    setTempLocationLevel(locationLevel);
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
        <View style={styles.content}>
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

            {/* Privacy Explanation */}
            <View style={styles.privacyInfo}>
              <Ionicons name="information-circle-outline" size={20} color="#666" />
              <Text style={styles.privacyText}>
                Lower precision settings provide more privacy by sharing less specific location data. 
                Higher precision allows for more accurate location verification but shares more detailed location information.
              </Text>
            </View>
          </View>
        </View>
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
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

export { SettingsModal, LOCATION_LEVELS };