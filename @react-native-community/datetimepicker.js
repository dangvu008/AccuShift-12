// Mock DateTimePicker component for Snack
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Simple mock implementation of DateTimePicker
const DateTimePicker = ({ value, mode, is24Hour, display, onChange }) => {
  // This is a very simple mock that just shows a button
  // In a real app, this would be replaced by the actual DateTimePicker
  
  const handlePress = () => {
    // Create a mock event and call onChange with a new date
    const mockEvent = { type: 'set' };
    const newDate = new Date();
    
    // Call the onChange handler with our mock data
    if (onChange) {
      onChange(mockEvent, newDate);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Text style={styles.text}>
        {mode === 'date' ? 'Select Date' : 'Select Time'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#8a56ff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DateTimePicker;
