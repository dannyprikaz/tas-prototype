import React from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import Text from '../components/text';
import BottomNav from '../components/bottomNav';
import Header from '../components/header';

const HomeScreen = ({ navigation }) => {
  const iconSize = 40;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header navigation={navigation}></Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Recent Scans Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={iconSize} color="black" />
            <Text style={styles.sectionTitle}>Recent Scans</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {[...Array(6).keys()].map((item) => (
              <TouchableOpacity key={`recent-${item}`} onPress={() => navigation.navigate('ScanResult')}>
                <Image 
                  source={{ uri: `https://picsum.photos/200/200?random=${item}` }} 
                  style={styles.thumbnail} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Favorite Creators Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="star" size={iconSize} color="black" />
            <Text style={styles.sectionTitle}>Favorite Creators</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {[...Array(6).keys()].map((index) => index + 6).map((item) => (
              <TouchableOpacity key={`creator-${item}`} onPress={() => navigation.navigate('Profile')}>
                <Image 
                  source={{ uri: `https://picsum.photos/200/200?random=${item}` }} 
                  style={styles.thumbnail} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Happening Near You Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={iconSize} color="black" />
            <Text style={styles.sectionTitle}>Happening Near You</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {[...Array(6).keys()].map((index) => index + 12).map((item) => (
              <TouchableOpacity key={`nearby-${item}`} onPress={() => navigation.navigate('ScanResult')}>
                <Image 
                  source={{ uri: `https://picsum.photos/200/200?random=${item}` }} 
                  style={styles.thumbnail} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav navigation={navigation}></BottomNav>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC107', // The yellow color from wireframes
  },
  content: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  horizontalScroll: {
    paddingLeft: 20,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginRight: 10,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  navButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;