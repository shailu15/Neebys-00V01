import React from 'react'
import { Tabs } from 'expo-router'
import {Ionicons} from "@expo/vector-icons"

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: true,
              headerTitleAlign: "center",
              tabBarStyle: {
                  backgroundColor: "black",
                  borderTopWidth: 0,
                  position: 'absolute',
                  elevation: 0,
                  height: 40,
                  paddingBottom: 8,
        }
      }}
    >
      <Tabs.Screen
        name="index"
              options={{
            title: 'Home Screen ',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Edit"
              options={{
            title: 'Edit Screen',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Live"
              options={{
            title: 'Live Screen',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Dashboard"
              options={{
            title: 'Sales Dashboard',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
              options={{
                  title: "Profile Screen",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}