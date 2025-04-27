"use client"

import { useState, useEffect, useContext } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import { formatDate } from "../utils/helpers"
import AsyncStorage from "@react-native-async-storage/async-storage"

const LogHistoryScreen = ({ navigation }) => {
  const { t, darkMode } = useContext(AppContext)
  const [historyData, setHistoryData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadHistoryData()

    // Refresh when screen is focused
    const unsubscribe = navigation.addListener("focus", loadHistoryData)
    return unsubscribe
  }, [navigation])

  const loadHistoryData = async () => {
    setIsLoading(true)
    try {
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys()
      const logKeys = keys.filter((key) => key.startsWith("attendanceLogs_"))

      // Sort keys in descending order (newest first)
      logKeys.sort().reverse()

      // Get data for each day
      const historyItems = []

      for (const key of logKeys) {
        const dateStr = key.replace("attendanceLogs_", "")
        const logsJson = await AsyncStorage.getItem(key)

        if (logsJson) {
          const logs = JSON.parse(logsJson)

          if (logs.length > 0) {
            // Count logs by type
            const counts = {
              go_work: 0,
              check_in: 0,
              check_out: 0,
              punch: 0,
              complete: 0,
            }

            logs.forEach((log) => {
              if (counts[log.type] !== undefined) {
                counts[log.type]++
              }
            })

            // Get first and last log timestamps
            const timestamps = logs.map((log) => log.timestamp)
            const firstLog = Math.min(...timestamps)
            const lastLog = Math.max(...timestamps)

            historyItems.push({
              date: dateStr,
              logCount: logs.length,
              counts,
              firstLog,
              lastLog,
              hasPhotos: logs.some((log) => log.photoUri),
            })
          }
        }
      }

      setHistoryData(historyItems)
    } catch (error) {
      console.error("Error loading history data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderHistoryItem = ({ item }) => {
    const date = new Date(item.date.split("-").join("/"))
    const formattedDate = formatDate(date)

    // Format first and last log times
    const firstLogTime = new Date(item.firstLog).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const lastLogTime = new Date(item.lastLog).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    return (
      <TouchableOpacity
        style={[styles.historyItem, darkMode && styles.darkHistoryItem]}
        onPress={() => navigation.navigate("LogHistoryDetail", { date: item.date })}
      >
        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, darkMode && styles.darkText]}>{formattedDate}</Text>
          <Text style={[styles.timeRangeText, darkMode && styles.darkSubtitle]}>
            {firstLogTime} - {lastLogTime}
          </Text>
        </View>

        <View style={styles.logInfoContainer}>
          <View style={styles.logCountContainer}>
            <Text style={[styles.logCountText, darkMode && styles.darkText]}>{item.logCount}</Text>
            <Text style={[styles.logCountLabel, darkMode && styles.darkSubtitle]}>{t("Logs")}</Text>
          </View>

          <View style={styles.logTypesContainer}>
            {item.counts.check_in > 0 && (
              <View style={styles.logTypeItem}>
                <Ionicons name="log-in-outline" size={16} color={darkMode ? "#8a56ff" : "#8a56ff"} />
                <Text style={[styles.logTypeCount, darkMode && styles.darkText]}>{item.counts.check_in}</Text>
              </View>
            )}

            {item.counts.check_out > 0 && (
              <View style={styles.logTypeItem}>
                <Ionicons name="log-out-outline" size={16} color={darkMode ? "#3498db" : "#3498db"} />
                <Text style={[styles.logTypeCount, darkMode && styles.darkText]}>{item.counts.check_out}</Text>
              </View>
            )}

            {item.counts.punch > 0 && (
              <View style={styles.logTypeItem}>
                <Ionicons name="finger-print-outline" size={16} color={darkMode ? "#e74c3c" : "#e74c3c"} />
                <Text style={[styles.logTypeCount, darkMode && styles.darkText]}>{item.counts.punch}</Text>
              </View>
            )}

            {item.hasPhotos && (
              <View style={styles.photoIndicator}>
                <Ionicons name="image-outline" size={16} color={darkMode ? "#2ecc71" : "#2ecc71"} />
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={darkMode ? "#aaa" : "#999"} />
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <FlatList
        data={historyData}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={darkMode ? "#555" : "#ccc"} />
            <Text style={[styles.emptyText, darkMode && styles.darkText]}>
              {isLoading ? t("Loading...") : t("No attendance history found")}
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  listContent: {
    padding: 16,
  },
  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  darkHistoryItem: {
    backgroundColor: "#1e1e1e",
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  timeRangeText: {
    fontSize: 14,
    color: "#666",
  },
  logInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  logCountContainer: {
    alignItems: "center",
    marginRight: 16,
  },
  logCountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  logCountLabel: {
    fontSize: 12,
    color: "#666",
  },
  logTypesContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  logTypeCount: {
    fontSize: 14,
    color: "#000",
    marginLeft: 2,
  },
  photoIndicator: {
    marginLeft: 4,
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
})

export default LogHistoryScreen
