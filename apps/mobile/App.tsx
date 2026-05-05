import 'react-native-gesture-handler'
import React from 'react'
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import MatchesScreen from './src/screens/MatchesScreen'
import RecordScreen from './src/screens/RecordScreen'
import UploadMatchScreen from './src/screens/UploadMatchScreen'
import MatchDetailScreen from './src/screens/MatchDetailScreen'

const Stack = createNativeStackNavigator()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <NavigationContainer>
      {Platform.OS !== 'web' && <StatusBar style="auto" />}
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Tennis Buddy' }} />
            <Stack.Screen name="Matches" component={MatchesScreen} options={{ title: 'Matches' }} />
            <Stack.Screen name="UploadMatch" component={UploadMatchScreen} options={{ title: 'Upload Match' }} />
            <Stack.Screen name="Record" component={RecordScreen} options={{ title: 'Record Match' }} />
            <Stack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: 'Match Details' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  loadingText: {
    marginTop: 16,
    color: '#15803d',
    fontSize: 16,
  },
})
