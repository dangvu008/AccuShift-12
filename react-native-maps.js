// Mock implementation for react-native-maps
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

// Directly mock the UIManager on the global object
// This is more likely to be picked up by the library
if (!global.UIManager) {
  global.UIManager = {
    hasViewManagerConfig: () => true,
    getViewManagerConfig: () => ({
      Commands: {},
    }),
  }
}

// Mock NativeModules if needed
if (!global.NativeModules) {
  global.NativeModules = {
    UIManager: global.UIManager,
    RNAirMapsModule: {
      create: () => {},
      startObserving: () => {},
      stopObserving: () => {},
    },
  }
}

// Mock MapView component
const MapView = ({
  style,
  initialRegion,
  onRegionChange,
  children,
  ...props
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>Map View</Text>
      {children}
    </View>
  )
}

// Add static properties to MapView
MapView.Marker = ({ coordinate, title, description, ...props }) => {
  return null // Markers won't be visible in the mock
}

// Add other commonly used components
MapView.Callout = (props) => null
MapView.Circle = (props) => null
MapView.Polygon = (props) => null
MapView.Polyline = (props) => null
MapView.Heatmap = (props) => null

// Add constants that might be used
MapView.PROVIDER_GOOGLE = 'google'
MapView.PROVIDER_DEFAULT = 'default'

// Mock Marker component separately for direct import
const Marker = MapView.Marker

// Mock styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
})

// Mock animateToRegion and other methods
MapView.prototype.animateToRegion = function (region, duration) {}
MapView.prototype.getCamera = function () {
  return {}
}
MapView.prototype.setCamera = function (camera) {}

export default MapView
export { Marker }
