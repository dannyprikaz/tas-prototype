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
            {(() => {
                if (isProfile) {
                    return (
                        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                            <View style={styles.settingsIcon}>
                            <Ionicons name="menu" size={40} color="black" />
                            </View>
                        </TouchableOpacity>
                    );
                } else {
                    return (
                        <TouchableOpacity onPress={() => navigation.navigate('MeProfile')}>
                            <View style={styles.profileIcon}>
                            <Ionicons name="person" size={40} color="black" />
                            </View>
                        </TouchableOpacity>
                    );
                }

            })()}
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 66,
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
    settingsIcon: {
      width: 60,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
});

export default Header;