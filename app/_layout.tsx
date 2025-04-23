import { SplashScreen, Stack } from "expo-router";
import { Kanit_700Bold, useFonts } from "@expo-google-fonts/kanit";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Kanit_700Bold,
  })

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }
  
  return <Stack
    screenOptions={{
      headerShown: false,
    }}
   />;
}
