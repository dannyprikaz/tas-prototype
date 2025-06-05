import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import BottomNav from '../components/bottomNav';
import Text from '../components/text';
import Header from '../components/header';
import SignatureDescription from '../components/signatureDescription';

const MeProfileScreen = ({ navigation }) => {
  let iconSize = 40;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header navigation={navigation} isProfile={true}></Header>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <Image 
            source={{ uri: 'https://picsum.photos/200/200?random=31' }} 
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

        {/* Signature List */}
        <View style={styles.signatureList}>
          { dummySignatures.map((signature) => {
            return <SignatureDescription description={signature} />;
          })}
          {/* Add more signatures here */}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav navigation={navigation}></BottomNav>
    </SafeAreaView>
  );
};

const dummySignatures = [
  {
    key: 1,
    nickName: 'Just A Signature',
    date: 'Feb. 10',
    time: '8:30 AM',
    location: 'Los Angeles',
  },
  {
    key: 2,
    nickName: 'Just A Signature',
    date: 'Feb. 10',
    time: '8:30 AM',
    location: 'Los Angeles',
  },
  {
    key: 3,
    nickName: 'Just A Signature',
    date: 'Feb. 10',
    time: '8:30 AM',
    location: 'Los Angeles',
  },
  {
    key: 4,
    nickName: 'Just A Signature',
    date: 'Feb. 10',
    time: '8:30 AM',
    location: 'Los Angeles',
  },
  {
    key: 5,
    nickName: 'Just A Signature',
    date: 'Feb. 10',
    time: '8:30 AM',
    location: 'Los Angeles',
  },
]

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
  signatureList: {
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    justifyContent: 'space-between',
  },
});

export default MeProfileScreen;