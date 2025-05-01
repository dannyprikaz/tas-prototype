import React from "react";
import { View } from "react-native";
import Svg, { Path, G } from "react-native-svg";

const TasLogo = () => {
    return (
        <View style={{width:'65%', aspectRatio:1, alignItems: 'center'}}>
            <Svg height="100%" width="100%" viewBox="0 0 20 20">
                <G stroke="black" strokeWidth="0.8" fill="none" strokeLinejoin="round" strokeLinecap="square">
                    <Path d="m 19,14 v 5 h -5"></Path>
                    <Path d="m 14,1 h 5 v 5"></Path>
                    <Path d="M 1,6 V 1 h 5"></Path>
                    <Path d="m 6.00004,19 h -5 v -5"></Path>
                    <Path d="m 10,4.5 v 11 M 6,4.5 h 8 M 11.5,17 H 8 V 7.5673435 M 7,6.5 H 4 v -2 M 4,3 h 12 v 3.5 h -4 v 9"></Path>
                </G>
            </Svg>
        </View>
    );
};

export default TasLogo;