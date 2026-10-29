import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { colors } from '../../theme';

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Zlecenia',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Kierowca',
          tabBarIcon: ({ color, size }) => <Ionicons name="id-card-outline" color={String(color)} size={size} />,
        }}
      />
    </Tabs>
  );
}
