"use client"

import { useState, useContext } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import * as DocumentPicker from "expo-document-picker"

const BackupRestoreScreen = () => {
  const { t, darkMode } = useContext(AppContext)
  const [isLoading, setIsLoading] = useState(false)

  const createBackup = async () => {
    try {
      setIsLoading(true)

      // Get all data from AsyncStorage
      const keys = await AsyncStorage.getAllKeys()
      const result = await AsyncStorage.multiGet(keys)

      // Create backup object
      const backupData = {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        data: result.reduce((obj, [key, value]) => {
          obj[key] = value
          return obj
        }, {}),
      }

      // Convert to JSON
      const backupJson = JSON.stringify(backupData)

      // Create file
      const fileName = `accshift_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      const filePath = `${FileSystem.documentDirectory}${fileName}`

      await FileSystem.writeAsStringAsync(filePath, backupJson)

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath)
      } else {
        Alert.alert(t("Sharing not available"), t("Sharing is not available on this device"))
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Backup error:", error)
      Alert.alert(t("Backup Error"), t("An error occurred while creating the backup"))
      setIsLoading(false)
    }
  }

  const restoreBackup = async () => {
    try {
      setIsLoading(true)

      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      })

      if (result.canceled) {
        setIsLoading(false)
        return
      }

      // Read file
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri)
      const backupData = JSON.parse(fileContent)

      // Validate backup
      if (!backupData.version || !backupData.data) {
        Alert.alert(t("Invalid Backup"), t("The selected file is not a valid backup"))
        setIsLoading(false)
        return
      }

      // Confirm restore
      Alert.alert(t("Restore Backup"), t("This will replace all your current data. Continue?"), [
        {
          text: t("Cancel"),
          style: "cancel",
          onPress: () => setIsLoading(false),
        },
        {
          text: t("Restore"),
          onPress: async () => {
            try {
              // Clear current data
              await AsyncStorage.clear()

              // Restore data
              for (const [key, value] of Object.entries(backupData.data)) {
                if (value) {
                  await AsyncStorage.setItem(key, value)
                }
              }

              Alert.alert(t("Restore Complete"), t("Your data has been restored. The app will now restart."), [
                {
                  text: "OK",
                  onPress: () => {
                    // In a real app, you would restart the app here
                    setIsLoading(false)
                  },
                },
              ])
            } catch (error) {
              console.error("Restore error:", error)
              Alert.alert(t("Restore Error"), t("An error occurred while restoring the backup"))
              setIsLoading(false)
            }
          },
        },
      ])
    } catch (error) {
      console.error("Restore error:", error)
      Alert.alert(t("Restore Error"), t("An error occurred while restoring the backup"))
      setIsLoading(false)
    }
  }

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8a56ff" />
          <Text style={[styles.loadingText, darkMode && styles.darkText]}>{t("Please wait...")}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.card, darkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, darkMode && styles.darkText]}>{t("Backup Data")}</Text>
            <Text style={[styles.cardDescription, darkMode && styles.darkSubtitle]}>
              {t("Create a backup of all your data including shifts, check-in history, and settings")}
            </Text>

            <TouchableOpacity style={styles.actionButton} onPress={createBackup}>
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>{t("Create Backup")}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, darkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, darkMode && styles.darkText]}>{t("Restore Data")}</Text>
            <Text style={[styles.cardDescription, darkMode && styles.darkSubtitle]}>
              {t("Restore your data from a previously created backup file")}
            </Text>

            <TouchableOpacity style={[styles.actionButton, styles.restoreButton]} onPress={restoreBackup}>
              <Ionicons name="cloud-download-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>{t("Restore from Backup")}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, darkMode && styles.darkCard]}>
            <Text style={[styles.cardTitle, darkMode && styles.darkText]}>{t("Data Management")}</Text>
            <Text style={[styles.cardDescription, darkMode && styles.darkSubtitle]}>
              {t("Other data management options")}
            </Text>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={() => {
                Alert.alert(
                  t("Clear All Data"),
                  t("This will permanently delete all your data. This action cannot be undone. Continue?"),
                  [
                    {
                      text: t("Cancel"),
                      style: "cancel",
                    },
                    {
                      text: t("Clear All Data"),
                      style: "destructive",
                      onPress: async () => {
                        try {
                          setIsLoading(true)
                          await AsyncStorage.clear()
                          Alert.alert(t("Data Cleared"), t("All data has been cleared. The app will now restart."), [
                            {
                              text: "OK",
                              onPress: () => {
                                // In a real app, you would restart the app here
                                setIsLoading(false)
                              },
                            },
                          ])
                        } catch (error) {
                          console.error("Clear data error:", error)
                          Alert.alert(t("Error"), t("An error occurred while clearing data"))
                          setIsLoading(false)
                        }
                      },
                    },
                  ],
                )
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>{t("Clear All Data")}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  darkContainer: {
    backgroundColor: "#121212",
  },
  darkText: {
    color: "#fff",
  },
  darkSubtitle: {
    color: "#aaa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  darkCard: {
    backgroundColor: "#1e1e1e",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#8a56ff",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButton: {
    backgroundColor: "#3498db",
  },
  dangerButton: {
    backgroundColor: "#e74c3c",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
})

export default BackupRestoreScreen
