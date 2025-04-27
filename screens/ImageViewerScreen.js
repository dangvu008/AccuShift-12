"use client"

import { useState, useContext } from "react"
import { View, Image, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"

const ImageViewerScreen = ({ navigation, route }) => {
  const { t, darkMode } = useContext(AppContext)
  const { uri } = route.params
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setError(true)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        url: uri,
        message: t("Attendance photo"),
      })
    } catch (error) {
      console.error("Error sharing image:", error)
    }
  }

  const handleSave = async () => {
    try {
      // In a real app, you would save the image to the device's gallery
      // For now, we'll just show a success message
      alert(t("Image saved to gallery"))
    } catch (error) {
      console.error("Error saving image:", error)
    }
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.imageContainer}>
        {isLoading && <ActivityIndicator size="large" color="#8a56ff" style={styles.loader} />}

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={darkMode ? "#aaa" : "#ccc"} />
            <Text style={[styles.errorText, darkMode && styles.darkText]}>{t("Failed to load image")}</Text>
          </View>
        ) : (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close-outline" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>

        <View style={styles.toolbarActions}>
          <TouchableOpacity style={styles.toolbarButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={darkMode ? "#fff" : "#000"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarButton} onPress={handleSave}>
            <Ionicons name="download-outline" size={24} color={darkMode ? "#fff" : "#000"} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  darkContainer: {
    backgroundColor: "#000",
  },
  darkText: {
    color: "#fff",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loader: {
    position: "absolute",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ccc",
    marginTop: 16,
    textAlign: "center",
  },
  toolbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  toolbarActions: {
    flexDirection: "row",
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
})

export default ImageViewerScreen
