import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Text from '../components/text';
import Header from '../components/header';
import BottomNav from '../components/bottomNav';

const ScanResultScreen = ({ navigation }) => {
  let iconSize = 60;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header navigation={navigation}></Header>

      <View style={styles.content}>
        {/* Main Image with T-shaped QR code overlay */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://picsum.photos/800/500' }} 
            style={styles.mainImage} 
            resizeMode="cover"
          />
          <View style={styles.qrOverlay}>
            {/* T-shaped QR code */}
          </View>
        </View>

        {/* Creator Info */}
        <View style={styles.creatorContainer}>
          <Image 
            source={{ uri: 'https://picsum.photos/200/200?random=20' }} 
            style={styles.creatorImage} 
          />
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
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>See Original</Text>
          </TouchableOpacity>
        </View>

        {/* Action Icons */}
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="link" size={iconSize} color="black" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="report-gmailerrorred" size={iconSize} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation */}
      <BottomNav navigation={navigation}></BottomNav>
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
  },
  imageContainer: {
    position: 'relative',
    flex: 3.5,
    marginBottom: 20,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  qrOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 60,
    height: 60,
    backgroundColor: '#FFC107',
    borderRadius: 5,
  },
  creatorContainer: {
    flexDirection: 'row',
    padding: 10,
    flex: 2, 
  },
  creatorImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginRight: 15,
  },
  infoContainer: {
    flex: 2,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
    width: '75%',
  },
  infoLabel: {
    fontWeight: 'bold',
    fontSize: 20,
    flex: 1,
  },
  infoValue: {
    fontSize: 20,
  },
  actionContainer: {
    flex: 1,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    alignSelf: 'center',
  },
  actionButtonText: {
    fontSize: 20,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1
  },
  iconButton: {
    marginHorizontal: 15,
  },
});

export default ScanResultScreen;