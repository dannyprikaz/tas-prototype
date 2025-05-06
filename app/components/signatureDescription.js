import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Text from "./text";

const SignatureDescription = ({ navigation, description }) => {
    return (
        <View style={styles.signatureDescription}>
            <TouchableOpacity>
                <Text style={styles.nickName}>{ description.nickName }</Text>
                <Text style={styles.metadata}>
                    { description.date }, { description.Time } - { description.location }
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    signatureDescription: {
        paddingBottom: 10,
    },
    nickName: {
        fontSize: 36,
        color: '#000',
    },
    metadata: {
        fontSize: 20,
        color: '#000',
    },
});

export default SignatureDescription;