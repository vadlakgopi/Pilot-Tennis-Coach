import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginScreen() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password')
      return
    }
    setIsLoading(true)
    try {
      await login(username.trim(), password)
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid username or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#f8fafc', '#f0f9ff', '#cffafe']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoRing}>
              <Text style={styles.logoEmoji}>🎾</Text>
            </View>
            <Text style={styles.appName}>Tennis Coach</Text>
            <Text style={styles.tagline}>AI-powered match analysis</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to your account</Text>

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor="#94a3b8"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Button */}
            <TouchableOpacity
              style={[styles.btn, isLoading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>Sign In</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Feature chips */}
          <View style={styles.features}>
            {['AI Shot Analysis', 'Match Highlights', 'Player Stats'].map(f => (
              <View key={f} style={styles.chip}>
                <Text style={styles.chipText}>✓ {f}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },

  hero: { alignItems: 'center', marginBottom: 32 },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 30, fontWeight: '900', color: '#0c4a6e', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#0369a1', marginTop: 4, fontWeight: '500' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0f172a',
  },
  eyeBtn: { padding: 4 },

  btn: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  features: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 28 },
  chip: {
    backgroundColor: 'rgba(14,165,233,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  chipText: { fontSize: 12, color: '#0369a1', fontWeight: '600' },
})
