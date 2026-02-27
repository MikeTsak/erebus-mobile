// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* This hides the default top header so your custom chat header shows instead */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}