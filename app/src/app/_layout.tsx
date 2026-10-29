import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/auth';
import { OrderProvider } from '../context/order';
import { colors } from '../theme';

function RootStack() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }
  const loggedIn = !!user;
  const isDriver = user?.role === 'driver';
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: '' }} />
        <Stack.Screen name="register" options={{ title: '' }} />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && !isDriver}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="confirm" options={{ title: 'Podsumowanie' }} />
        <Stack.Screen name="ride/[id]" options={{ title: 'Przejazd' }} />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && isDriver}>
        <Stack.Screen name="(driver)" options={{ headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Zlecenie' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrderProvider>
          <StatusBar style="light" />
          <RootStack />
        </OrderProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
