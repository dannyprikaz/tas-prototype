import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { Kanit_700Bold, useFonts } from '@expo-google-fonts/kanit';

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: 'Kanit_700Bold', // Replace 'YourCustomFont' with your font name
  },
});

export default function Text ({ style, ...props }) {
    let [fontsLoaded] = useFonts({
        Kanit_700Bold,
    });

    if (!fontsLoaded) {
        return
    } else {
        return (
          <RNText style={[styles.defaultFont, style]} {...props} />
        );
    }
}