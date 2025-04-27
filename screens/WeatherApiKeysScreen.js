"use client"

import { useState, useEffect, useContext } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Switch, TextInput, Modal, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import { getApiKeys, addApiKey, removeApiKey, toggleApiKey, clearWeatherCache } from "../services/weatherService"

const WeatherApiKeysScreen = ({ navigation }) => {
  const { t, darkMode } = useContext(AppContext)
  const [apiKeys, setApiKeys] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [keyType, setKeyType] = useState("free")
  const [priority, setPriority] = useState("10")
  const [refreshing, setRefreshing] = useState(false)
  const [secureEntry, setSecureEntry] = useState(true)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = () => {
    const keys = getApiKeys()
    setApiKeys(keys)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadApiKeys()
    setRefreshing(false)
  }

  const handleAddKey = async () => {
    if (!newKey.trim()) {
      Alert.alert(t("Error"), t("Please enter a valid API key"))
      return
    }

    const success = await addApiKey(newKey, keyType, Number.parseInt(priority))
    if (success) {
      setNewKey("")
      setKeyType("free")
      setPriority("10")
      setModalVisible(false)
      loadApiKeys()
      Alert.alert(t("Success"), t("API key added successfully"))
    } else {
      Alert.alert(t("Error"), t("Failed to add API key"))
    }
  }

  const handleRemoveKey = async (key) => {
    Alert.alert(t("Confirm Deletion"), t("Are you sure you want to delete this API key?"), [
      {
        text: t("Cancel"),
        style: "cancel",
      },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: async () => {
          const success = await removeApiKey(key)
          if (success) {
            loadApiKeys()
            Alert.alert(t("Success"), t("API key removed successfully"))
          } else {
            Alert.alert(t("Error"), t("Failed to remove API key"))
          }
        },
      },
    ])
  }

  const handleToggleKey = async (key, enabled) => {
    const success = await toggleApiKey(key, enabled)
    if (success) {
      loadApiKeys()
    } else {
      Alert.alert(t("Error"), t("Failed to update API key"))
    }
  }

  const handleClearCache = async () => {
    Alert.alert(t("Confirm Clear Cache"), t("Are you sure you want to clear all weather cache?"), [
      {
        text: t("Cancel"),
        style: "cancel",
      },
      {
        text: t("Clear"),
        style: "destructive",
        onPress: async () => {
          await clearWeatherCache()
          Alert.alert(t("Success"), t("Weather cache cleared successfully"))
        },
      },
    ])
  }

  const renderKeyItem = ({ item }) => (
    <View style={[styles.keyItem, darkMode && styles.darkKeyItem]}>
      <View style={styles.keyInfo}>
        <View style={styles.keyHeader}>
          <Text style={[styles.keyText, darkMode && styles.darkText]}>{item.key}</Text>
          <View style={[styles.keyTypeBadge, item.type === "paid" ? styles.paidBadge : styles.freeBadge]}>
            <Text style={styles.keyTypeBadgeText}>{item.type === "paid" ? t("Paid") : t("Free")}</Text>
          </View>
        </View>
        <View style={styles.keyDetails}>
          <Text style={[styles.keyDetailText, darkMode && styles.darkSubtitle]}>
            {t("Priority")}: {item.priority}
          </Text>
          <Text style={[styles.keyDetailText, darkMode && styles.darkSubtitle]}>
            {t("Usage")}: {item.usage}/60
          </Text>
        </View>
      </View>
      <View style={styles.keyActions}>
        <Switch
          value={item.enabled}
          onValueChange={(value) => handleToggleKey(item.key, value)}
          trackColor={{ false: "#767577", true: "#8a56ff" }}
          thumbColor={item.enabled ? "#fff" : "#f4f3f4"}
        />
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveKey(item.key)}>
          <Ionicons name="trash-outline" size={20} color={darkMode ? "#ff6b6b" : "#e74c3c"} />
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={[styles.header, darkMode && styles.darkHeader]}>
        <Text style={[styles.headerTitle, darkMode && styles.darkText]}>{t("Weather API Keys")}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoCard, darkMode && styles.darkCard]}>
        <Text style={[styles.infoTitle, darkMode && styles.darkText]}>{t("API Usage Information")}</Text>
        <Text style={[styles.infoText, darkMode && styles.darkSubtitle]}>
          {t("Free tier limits")}: 60 {t("requests/minute")}, 1,000,000 {t("requests/month")}
        </Text>
        <Text style={[styles.infoText, darkMode && styles.darkSubtitle]}>
          {t("Current cache duration")}: 24 {t("hours")}
        </Text>
        <Text style={[styles.securityText, darkMode && styles.darkSecurityText]}>
          <Ionicons name="shield-checkmark" size={16} color={darkMode ? "#8a56ff" : "#27ae60"} />{" "}
          {t("Keys are securely encrypted")}
        </Text>
        <TouchableOpacity style={styles.clearCacheButton} onPress={handleClearCache}>
          <Text style={styles.clearCacheButtonText}>{t("Clear Weather Cache")}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={apiKeys}
        renderItem={renderKeyItem}
        keyExtractor={(item, index) => `key-${index}`}
        contentContainerStyle={styles.keysList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color={darkMode ? "#555" : "#ccc"} />
            <Text style={[styles.emptyText, darkMode && styles.darkText]}>{t("No API keys found")}</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, darkMode && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, darkMode && styles.darkText]}>{t("Add New API Key")}</Text>

            <Text style={[styles.inputLabel, darkMode && styles.darkText]}>{t("API Key")}</Text>
            <View style={styles.secureInputContainer}>
              <TextInput
                style={[styles.input, styles.secureInput, darkMode && styles.darkInput]}
                value={newKey}
                onChangeText={setNewKey}
                placeholder={t("Enter OpenWeatherMap API key")}
                placeholderTextColor={darkMode ? "#777" : "#999"}
                secureTextEntry={secureEntry}
              />
              <TouchableOpacity style={styles.secureToggle} onPress={() => setSecureEntry(!secureEntry)}>
                <Ionicons
                  name={secureEntry ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={darkMode ? "#aaa" : "#666"}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.securityNote, darkMode && styles.darkSubtitle]}>
              <Ionicons name="information-circle-outline" size={14} color={darkMode ? "#aaa" : "#666"} />{" "}
              {t("Your API key will be securely encrypted")}
            </Text>

            <Text style={[styles.inputLabel, darkMode && styles.darkText]}>{t("Key Type")}</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  keyType === "free" && styles.radioButtonSelected,
                  darkMode && styles.darkRadioButton,
                  keyType === "free" && darkMode && styles.darkRadioButtonSelected,
                ]}
                onPress={() => setKeyType("free")}
              >
                <Text
                  style={[
                    styles.radioButtonText,
                    keyType === "free" && styles.radioButtonTextSelected,
                    darkMode && styles.darkText,
                  ]}
                >
                  {t("Free")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioButton,
                  keyType === "paid" && styles.radioButtonSelected,
                  darkMode && styles.darkRadioButton,
                  keyType === "paid" && darkMode && styles.darkRadioButtonSelected,
                ]}
                onPress={() => setKeyType("paid")}
              >
                <Text
                  style={[
                    styles.radioButtonText,
                    keyType === "paid" && styles.radioButtonTextSelected,
                    darkMode && styles.darkText,
                  ]}
                >
                  {t("Paid")}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, darkMode && styles.darkText]}>
              {t("Priority")} ({t("Lower number = Higher priority")})
            </Text>
            <TextInput
              style={[styles.input, darkMode && styles.darkInput]}
              value={priority}
              onChangeText={setPriority}
              placeholder="10"
              placeholderTextColor={darkMode ? "#777" : "#999"}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t("Cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleAddKey}>
                <Text style={styles.saveButtonText}>{t("Add Key")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  darkHeader: {
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  darkText: {
    color: "#fff",
  },
  darkSubtitle: {
    color: "#aaa",
  },
  refreshButton: {
    padding: 8,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  darkCard: {
    backgroundColor: "#1e1e1e",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  securityText: {
    fontSize: 14,
    color: "#27ae60",
    marginTop: 8,
    marginBottom: 8,
    fontWeight: "500",
  },
  darkSecurityText: {
    color: "#8a56ff",
  },
  clearCacheButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginTop: 8,
  },
  clearCacheButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  keysList: {
    paddingBottom: 80,
  },
  keyItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  darkKeyItem: {
    backgroundColor: "#1e1e1e",
  },
  keyInfo: {
    flex: 1,
  },
  keyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  keyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginRight: 8,
  },
  keyTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadge: {
    backgroundColor: "#3498db",
  },
  paidBadge: {
    backgroundColor: "#27ae60",
  },
  keyTypeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  keyDetails: {
    flexDirection: "row",
    marginTop: 4,
  },
  keyDetailText: {
    fontSize: 12,
    color: "#666",
    marginRight: 12,
  },
  keyActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8a56ff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  darkModalContent: {
    backgroundColor: "#1e1e1e",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: "#000",
  },
  secureInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 4,
  },
  secureInput: {
    flex: 1,
    marginBottom: 0,
    backgroundColor: "transparent",
  },
  secureToggle: {
    padding: 12,
  },
  securityNote: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
    fontStyle: "italic",
  },
  darkInput: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
  },
  radioGroup: {
    flexDirection: "row",
    marginBottom: 16,
  },
  radioButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  darkRadioButton: {
    backgroundColor: "#2a2a2a",
  },
  radioButtonSelected: {
    backgroundColor: "#8a56ff",
  },
  darkRadioButtonSelected: {
    backgroundColor: "#8a56ff",
  },
  radioButtonText: {
    color: "#000",
    fontWeight: "500",
  },
  radioButtonTextSelected: {
    color: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: "#ddd",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#8a56ff",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
})

export default WeatherApiKeysScreen
