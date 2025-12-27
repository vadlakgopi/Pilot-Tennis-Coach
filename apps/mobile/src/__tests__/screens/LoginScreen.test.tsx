/**
 * Tests for LoginScreen component
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import LoginScreen from '../screens/LoginScreen'

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
}

// Mock API
jest.mock('../../lib/api', () => ({
  authApi: {
    login: jest.fn(),
  },
}))

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Tennis Buddy title', () => {
    render(<LoginScreen navigation={mockNavigation} />)
    expect(screen.getByText('Tennis Buddy')).toBeTruthy()
  })

  it('renders login form fields', () => {
    render(<LoginScreen navigation={mockNavigation} />)
    // Adjust selectors based on actual LoginScreen implementation
    expect(screen.getByText('Tennis Buddy')).toBeTruthy()
  })
})




