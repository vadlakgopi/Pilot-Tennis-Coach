// Only import gesture-handler on native platforms
import React from 'react'
import { Platform } from 'react-native'
if (Platform.OS !== 'web') {
  require('react-native-gesture-handler')
}

// Add logging at the very top
console.log('[App] Starting app initialization...')

// Use proper imports instead of require
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

console.log('[App] NavigationContainer imported:', !!NavigationContainer)
console.log('[App] createNativeStackNavigator imported:', !!createNativeStackNavigator)

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import MatchesScreen from './src/screens/MatchesScreen'
import RecordScreen from './src/screens/RecordScreen'
import UploadMatchScreen from './src/screens/UploadMatchScreen'
import MatchDetailScreen from './src/screens/MatchDetailScreen'

// Verify components are imported correctly (just type check, don't log objects)
console.log('[App] LoginScreen type:', typeof LoginScreen)
console.log('[App] HomeScreen type:', typeof HomeScreen)

console.log('[App] Creating Stack navigator...')
const Stack = createNativeStackNavigator()
console.log('[App] Stack created:', !!Stack)
console.log('[App] Stack.Navigator:', !!Stack?.Navigator)
console.log('[App] Stack.Screen:', !!Stack?.Screen)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  console.log('[AppNavigator] Auth state:', { isAuthenticated, isLoading })

  if (isLoading) {
    console.log('[AppNavigator] Still loading auth state...')
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
      </View>
    )
  }
  
  console.log('[AppNavigator] Auth loaded. isAuthenticated:', isAuthenticated, 'Initial route:', isAuthenticated ? 'Home' : 'Login')

  const initialRoute = isAuthenticated ? 'Home' : 'Login'
  console.log('[AppNavigator] Initial route:', initialRoute)
  
  console.log('[AppNavigator] Rendering navigation...')
  return (
    <NavigationContainer>
      {Platform.OS !== 'web' && <StatusBar style="auto" />}
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ title: 'Login', headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Tennis Buddy' }}
        />
        <Stack.Screen 
          name="Matches" 
          component={MatchesScreen}
          options={{ title: 'Matches' }}
        />
        <Stack.Screen 
          name="UploadMatch" 
          component={UploadMatchScreen}
          options={{ title: 'Upload Match' }}
        />
        <Stack.Screen 
          name="Record" 
          component={RecordScreen}
          options={{ title: 'Record Match' }}
        />
        <Stack.Screen 
          name="MatchDetail" 
          component={MatchDetailScreen}
          options={{ title: 'Match Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  console.log('[App] App component rendering...')

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Simple error boundary for web
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, marginBottom: 10, fontWeight: 'bold' }}>Error loading app:</Text>
          <Text style={{ fontSize: 14, color: 'red', marginBottom: 5 }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 20, padding: 10, backgroundColor: '#0ea5e9', borderRadius: 8 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#fff' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return this.props.children
  }
}
