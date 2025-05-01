import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const BottomNav = ({ navigation }) => {
    let iconSize = 40;
    
    return (  
        <View style={styles.bottomNav}>
            <TouchableOpacity 
                style={styles.navButton}
            >
                <Ionicons name="list-outline" size={iconSize} color="black" />
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.navButton}
            >
                <MaterialIcons name="add-box" size={iconSize} color="black" />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigation.navigate('Scan')}
            >
                <MaterialIcons name="qr-code-scanner" size={iconSize} color="black" />
            </TouchableOpacity>
        </View>
    );  
};

const styles = StyleSheet.create({
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 10,
      alignItems: 'center',
    },
    navButton: {
      width: 50,
      height: 50,
      marginHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
});

export default BottomNav;