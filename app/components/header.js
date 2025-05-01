import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import Text from "./text";

const Header = ({ navigation, isProfile }) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                <Text style={styles.headerTitle}>TAS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => isProfile ? navigation.goBack() : navigation.navigate('Profile')}>
                <View style={styles.profileIcon}>
                <Ionicons name="person" size={40} color="black" />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 66,
        fontWeight: 'bold',
        color: '#000',
    },
    profileIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(0,0,0,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
});

export default Header;