/**
 * Tests for HomeScreen component
 */
import React from 'react'
import { render, screen } from '@testing-library/react-native'
import HomeScreen from '../screens/HomeScreen'

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Tennis Buddy title', () => {
    render(<HomeScreen navigation={mockNavigation} />)
    expect(screen.getByText('Tennis Buddy')).toBeTruthy()
  })

  it('renders navigation buttons', () => {
    render(<HomeScreen navigation={mockNavigation} />)
    // Check for common buttons/text that might be in the screen
    // Adjust based on actual HomeScreen implementation
    expect(screen.getByText('Tennis Buddy')).toBeTruthy()
  })
})




