import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import BottomNav from '../components/bottomNav';
import Text from '../components/text';
import Header from '../components/header';

const ProfileScreen = ({ navigation }) => {
  let iconSize = 40;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header navigation={navigation} isProfile={true}></Header>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <Image 
            source={{ uri: 'https://picsum.photos/200/200?random=30' }} 
            style={styles.profileImage} 
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Name</Text>
            <Text style={styles.userBio}>Bio</Text>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.socialLinks}>
          <TouchableOpacity style={styles.socialIcon}>
            <FontAwesome name="instagram" size={iconSize} color="black" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon}>
            <FontAwesome name="facebook" size={iconSize} color="black" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon}>
            <FontAwesome name="youtube-play" size={iconSize} color="black" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon}>
            <FontAwesome name="twitter" size={iconSize} color="black" />
          </TouchableOpacity>
        </View>

        <Text style={styles.linkText}>Additional Links:</Text>
        <Text style={styles.websiteLink}>creator.website.com</Text>

        {/* Content Grid */}
        <View style={styles.contentGrid}>
          <Image 
            source={{ uri: 'https://picsum.photos/400/400?random=31' }} 
            style={styles.contentImage} 
          />
          <Image 
            source={{ uri: 'https://picsum.photos/400/400?random=32' }} 
            style={styles.contentImage} 
          />
          {/* Add more images here */}
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
    backgroundColor: '#FFC107',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 5,
    marginRight: 15,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userBio: {
    fontSize: 22,
    color: '#333',
  },
  socialLinks: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-evenly',
  },
  socialIcon: {
    marginRight: 20,
  },
  linkText: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 24,
  },
  websiteLink: {
    marginBottom: 20,
    fontSize: 24,
  },
  contentGrid: {
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'space-between',
  },
  contentImage: {
    width: '60%',
    aspectRatio: 1,
    marginBottom: 10,
    borderRadius: 5,
  },
});

export default ProfileScreen;