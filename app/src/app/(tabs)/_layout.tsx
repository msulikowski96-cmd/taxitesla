import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { colors } from '../../theme';

export default function TabsLayout() {
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
        name="order"
        options={{
          title: 'Zamów',
          tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'Przejazdy',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={String(color)} size={size} />,
        }}
      />
    </Tabs>
  );
}
