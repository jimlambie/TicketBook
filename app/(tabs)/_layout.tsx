import { Tabs } from 'expo-router'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/constants/design'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => router.push('/event/new')}
              accessibilityLabel="Add event"
            >
              <View style={styles.fabInner}>
                <Ionicons name="add" size={26} color={C.bg} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: C.surface,
    borderTopColor: C.border,
    borderTopWidth: 0.5,
    height: 60,
    paddingBottom: 8,
  },
  tabLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 0.04,
  },
  fab: {
    top: -16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
