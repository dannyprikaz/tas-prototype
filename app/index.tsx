import { Stack } from "expo-router";
import { Platform, StatusBar, Text, View } from "react-native";
import Svg, { G, Path} from "react-native-svg";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFB200",
      }}
    >
      <StatusBar
        barStyle="dark-content" 
      />
      <Text
        style={{
          fontFamily: 'Kanit_700Bold',
          fontSize: 128,
        }}
      >TAS</Text>
      <Svg height="50%" width="50%" viewBox="0 0 20 20">
              <G stroke="black" stroke-width="0.8" fill="none" strokeLinejoin="round" strokeLinecap="square">
              <Path d="m 19,14 v 5 h -5"></Path>
              <Path d="m 14,1 h 5 v 5"></Path>
              <Path d="M 1,6 V 1 h 5"></Path>
              <Path d="m 6.00004,19 h -5 v -5"></Path>
              <Path d="m 10,4.5 v 11 M 6,4.5 h 8 M 11.5,17 H 8 V 7.5673435 M 7,6.5 H 4 v -2 M 4,3 h 12 v 3.5 h -4 v 9"></Path>
              </G>
      </Svg>
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
