/**
 * Tab navigation — premium iOS-style tab bar with proper icons,
 * matching theme color palette.
 */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../lib/theme';

const tabIcon =
  (
    name: keyof typeof Ionicons.glyphMap,
    focusedName?: keyof typeof Ionicons.glyphMap
  ) =>
  ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons
      name={focused ? (focusedName ?? name) : name}
      size={24}
      color={color}
    />
  );

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 0.5,
          height: 88,
          paddingTop: 6,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '600',
          fontSize: 11,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.bg,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { ...typography.h2 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: tabIcon('home-outline', 'home'),
          tabBarButtonTestID: 'tab-Home',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Activity',
          tabBarIcon: tabIcon('time-outline', 'time'),
          tabBarButtonTestID: 'tab-Activity',
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Earn',
          tabBarIcon: tabIcon('flash-outline', 'flash'),
          tabBarButtonTestID: 'tab-Earn',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person-outline', 'person'),
          tabBarButtonTestID: 'tab-Profile',
        }}
      />
    </Tabs>
  );
}
