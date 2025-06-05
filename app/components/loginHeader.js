import React from "react";
import { View, StyleSheet } from "react-native";
import Text from "./text"
import TasLogo from "./tasLogo";

const LoginHeader = () => {
    return (
        <View>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>TAS</Text>
            </View>
            
            <View style={styles.logoContainer}>
                <TasLogo></TasLogo>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
      alignItems: 'center',
      marginBottom: 10,
    },
    headerTitle: {
      fontSize: 100,
      fontWeight: 'bold',
      color: '#000',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
});

export default LoginHeader;