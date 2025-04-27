import * as Notifications from "expo-notifications"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { NOTIFICATION_CONFIG, STORAGE_KEYS } from "../config/appConfig"
import { formatDate } from "./helpers"
import { Platform } from "react-native"

// Cấu hình thông báo
export const setupNotifications = async () => {
  // Cấu hình handler cho thông báo
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data

      // Xử lý thông báo báo thức đặc biệt
      if (data.isAlarm) {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          priority: "max",
          // Trên Android, sử dụng full-screen intent
          ...(Platform.OS === "android" && {
            android: {
              channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
              priority: "max",
              fullScreenIntent: true,
            },
          }),
        }
      }

      // Thông báo thông thường
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }
    },
  })

  // Tạo kênh thông báo cho Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CONFIG.CHANNEL_ID, {
      name: NOTIFICATION_CONFIG.CHANNEL_NAME,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: NOTIFICATION_CONFIG.VIBRATION_PATTERN,
      lightColor: NOTIFICATION_CONFIG.LIGHT_COLOR,
    })
  }

  // Đăng ký xử lý khi nhận thông báo khi ứng dụng đang chạy
  const subscription = Notifications.addNotificationReceivedListener(handleNotification)

  // Đăng ký xử lý khi người dùng tương tác với thông báo
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)

  return () => {
    subscription.remove()
    responseSubscription.remove()
  }
}

// Xử lý khi nhận thông báo
const handleNotification = (notification) => {
  const data = notification.request.content.data

  // Ghi log thông báo nếu cần
  console.log("Received notification:", notification.request.content)

  // Xử lý thông báo báo thức đặc biệt
  if (data.isAlarm && data.type) {
    // Mở màn hình báo thức toàn màn hình
    // Điều này sẽ được xử lý bởi handleNotificationResponse
  }
}

// Xử lý khi người dùng tương tác với thông báo
const handleNotificationResponse = (response) => {
  const data = response.notification.request.content.data

  // Xử lý thông báo báo thức
  if (data.isAlarm) {
    // Mở màn hình báo thức toàn màn hình
    // Điều này sẽ được xử lý bởi navigation trong App.js
  }
}

// Lên lịch nhắc nhở cho ghi chú
export const scheduleNoteReminder = async (note, shifts, t) => {
  if (!note || !note.reminderTime) return false

  try {
    // Tạo ID duy nhất cho thông báo
    const notificationId = `note_${note.id}`

    // Hủy thông báo cũ nếu có
    await cancelNoteReminder(notificationId)

    // Xử lý thời gian nhắc nhở
    const [hours, minutes] = note.reminderTime.split(":").map(Number)

    // Nếu ghi chú liên kết với ca làm việc
    if (note.linkedShifts && note.linkedShifts.length > 0) {
      // Lên lịch nhắc nhở cho từng ca làm việc
      for (const shiftId of note.linkedShifts) {
        const shift = shifts.find((s) => s.id === shiftId)
        if (!shift) continue

        // Lên lịch nhắc nhở cho các ngày áp dụng của ca
        for (const day of shift.daysApplied) {
          await scheduleReminderForDay(day, hours, minutes, note, notificationId, t, shift)
        }
      }
    }
    // Nếu ghi chú sử dụng ngày tùy chỉnh
    else if (note.reminderDays && note.reminderDays.length > 0) {
      // Lên lịch nhắc nhở cho từng ngày đã chọn
      for (const day of note.reminderDays) {
        await scheduleReminderForDay(day, hours, minutes, note, notificationId, t)
      }
    }

    return true
  } catch (error) {
    console.error("Error scheduling note reminder:", error)
    return false
  }
}

// Lên lịch nhắc nhở cho một ngày cụ thể
const scheduleReminderForDay = async (day, hours, minutes, note, notificationId, t, shift = null) => {
  // Chuyển đổi ngày trong tuần sang số (0 = CN, 1 = T2, ...)
  const dayMap = { CN: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6 }
  const dayOfWeek = dayMap[day]

  if (dayOfWeek === undefined) return

  // Tính toán thời gian nhắc nhở tiếp theo
  const now = new Date()
  const reminderTime = new Date()
  reminderTime.setHours(hours, minutes, 0, 0)

  // Tính số ngày cần thêm để đến ngày trong tuần tiếp theo
  const currentDayOfWeek = now.getDay()
  let daysToAdd = dayOfWeek - currentDayOfWeek

  if (daysToAdd < 0) {
    daysToAdd += 7 // Chuyển sang tuần sau
  } else if (daysToAdd === 0 && reminderTime <= now) {
    daysToAdd = 7 // Nếu là hôm nay nhưng đã qua giờ nhắc, chuyển sang tuần sau
  }

  reminderTime.setDate(reminderTime.getDate() + daysToAdd)

  // Nếu thời gian nhắc nhở đã qua, không lên lịch
  if (reminderTime <= now) return

  // Chuẩn bị nội dung thông báo
  const title = note.title || t("Note Reminder")
  let body = note.content || ""

  // Thêm thông tin ca làm việc nếu có
  if (shift) {
    body = `${body}\n${t("Shift")}: ${shift.name}`
  }

  // Lên lịch thông báo báo thức
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: {
        isAlarm: true,
        type: "note",
        noteId: note.id,
        shiftId: shift?.id,
        title: title,
        message: body,
        time: reminderTime.toISOString(),
      },
      sound: true,
      channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
    },
    trigger: {
      date: reminderTime,
      repeats: true,
      weekday: dayOfWeek + 1, // Notifications API sử dụng 1-7 cho CN-T7
    },
    identifier: `${notificationId}_${day}`,
  })
}

/**
 * Hủy nhắc nhở cho ghi chú
 * @param {string} notificationId ID thông báo
 */
export const cancelNoteReminder = async (notificationId) => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()

    // Tìm và hủy tất cả thông báo liên quan đến ghi chú
    for (const notification of scheduledNotifications) {
      if (notification.identifier.startsWith(notificationId)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier)
      }
    }

    return true
  } catch (error) {
    console.error("Error canceling note reminder:", error)
    return false
  }
}

/**
 * Lên lịch nhắc nhở cho ca làm việc
 * @param {Object} shift Ca làm việc
 * @param {Function} t Hàm dịch
 * @returns {Promise<boolean>} Kết quả lên lịch
 */
export const scheduleShiftReminder = async (shift, t) => {
  if (!shift) return false

  try {
    // Tạo ID duy nhất cho thông báo
    const notificationId = `shift_${shift.id}`

    // Hủy thông báo cũ nếu có
    await cancelShiftReminder(notificationId)

    // Xử lý thời gian bắt đầu ca
    const [startHour, startMinute] = shift.startTime.split(":").map(Number)

    // Lên lịch nhắc nhở trước khi bắt đầu ca
    if (shift.reminderBefore > 0) {
      for (const day of shift.daysApplied) {
        await scheduleShiftStartReminder(day, startHour, startMinute, shift, notificationId, t)
      }
    }

    // Xử lý thời gian kết thúc ca
    const [endHour, endMinute] = shift.endTime.split(":").map(Number)

    // Lên lịch nhắc nhở trước khi kết thúc ca
    if (shift.reminderAfter > 0) {
      for (const day of shift.daysApplied) {
        await scheduleShiftEndReminder(day, endHour, endMinute, shift, notificationId, t)
      }
    }

    return true
  } catch (error) {
    console.error("Error scheduling shift reminder:", error)
    return false
  }
}

/**
 * Lên lịch nhắc nhở trước khi bắt đầu ca
 */
const scheduleShiftStartReminder = async (day, startHour, startMinute, shift, notificationId, t) => {
  // Chuyển đổi ngày trong tuần sang số (0 = CN, 1 = T2, ...)
  const dayMap = { CN: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6 }
  const dayOfWeek = dayMap[day]

  if (dayOfWeek === undefined) return

  // Tính toán thời gian bắt đầu ca
  const now = new Date()
  const shiftStart = new Date()
  shiftStart.setHours(startHour, startMinute, 0, 0)

  // Tính số ngày cần thêm để đến ngày trong tuần tiếp theo
  const currentDayOfWeek = now.getDay()
  let daysToAdd = dayOfWeek - currentDayOfWeek

  if (daysToAdd < 0) {
    daysToAdd += 7 // Chuyển sang tuần sau
  } else if (daysToAdd === 0 && shiftStart <= now) {
    daysToAdd = 7 // Nếu là hôm nay nhưng đã qua giờ bắt đầu, chuyển sang tuần sau
  }

  shiftStart.setDate(shiftStart.getDate() + daysToAdd)

  // Tính thời gian nhắc nhở (trước khi bắt đầu ca)
  const reminderTime = new Date(shiftStart.getTime() - shift.reminderBefore * 60 * 1000)

  // Nếu thời gian nhắc nhở đã qua, không lên lịch
  if (reminderTime <= now) return

  // Lên lịch thông báo báo thức
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t("Shift Reminder"),
      body: `${shift.name} ${t("starts in")} ${shift.reminderBefore} ${t("minutes")}`,
      data: {
        isAlarm: true,
        type: "shift",
        shiftId: shift.id,
        title: t("Shift Reminder"),
        message: `${shift.name} ${t("starts in")} ${shift.reminderBefore} ${t("minutes")}`,
        time: reminderTime.toISOString(),
        reminderType: "start",
      },
      sound: true,
      channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
    },
    trigger: {
      date: reminderTime,
      repeats: true,
      weekday: dayOfWeek + 1, // Notifications API sử dụng 1-7 cho CN-T7
    },
    identifier: `${notificationId}_start_${day}`,
  })
}

/**
 * Lên lịch nhắc nhở trước khi kết thúc ca
 */
const scheduleShiftEndReminder = async (day, endHour, endMinute, shift, notificationId, t) => {
  // Chuyển đổi ngày trong tuần sang số (0 = CN, 1 = T2, ...)
  const dayMap = { CN: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6 }
  const dayOfWeek = dayMap[day]

  if (dayOfWeek === undefined) return

  // Tính toán thời gian kết thúc ca
  const now = new Date()
  const shiftEnd = new Date()
  shiftEnd.setHours(endHour, endMinute, 0, 0)

  // Tính số ngày cần thêm để đến ngày trong tuần tiếp theo
  const currentDayOfWeek = now.getDay()
  let daysToAdd = dayOfWeek - currentDayOfWeek

  if (daysToAdd < 0) {
    daysToAdd += 7 // Chuyển sang tuần sau
  } else if (daysToAdd === 0 && shiftEnd <= now) {
    daysToAdd = 7 // Nếu là hôm nay nhưng đã qua giờ kết thúc, chuyển sang tuần sau
  }

  shiftEnd.setDate(shiftEnd.getDate() + daysToAdd)

  // Tính thời gian nhắc nhở (trước khi kết thúc ca)
  const reminderTime = new Date(shiftEnd.getTime() - shift.reminderAfter * 60 * 1000)

  // Nếu thời gian nhắc nhở đã qua, không lên lịch
  if (reminderTime <= now) return

  // Lên lịch thông báo báo thức
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t("Shift Ending Soon"),
      body: `${shift.name} ${t("will end in")} ${shift.reminderAfter} ${t("minutes")}`,
      data: {
        isAlarm: true,
        type: "shift",
        shiftId: shift.id,
        title: t("Shift Ending Soon"),
        message: `${shift.name} ${t("will end in")} ${shift.reminderAfter} ${t("minutes")}`,
        time: reminderTime.toISOString(),
        reminderType: "end",
      },
      sound: true,
      channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
    },
    trigger: {
      date: reminderTime,
      repeats: true,
      weekday: dayOfWeek + 1, // Notifications API sử dụng 1-7 cho CN-T7
    },
    identifier: `${notificationId}_end_${day}`,
  })
}

/**
 * Hủy nhắc nhở cho ca làm việc
 * @param {string} notificationId ID thông báo
 */
export const cancelShiftReminder = async (notificationId) => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()

    // Tìm và hủy tất cả thông báo liên quan đến ca làm việc
    for (const notification of scheduledNotifications) {
      if (notification.identifier.startsWith(notificationId)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier)
      }
    }

    return true
  } catch (error) {
    console.error("Error canceling shift reminder:", error)
    return false
  }
}

/**
 * Ghi log thông báo vào AsyncStorage
 * @param {Object} notification Thông báo
 */
export const logNotification = async (notification) => {
  try {
    const now = new Date()
    const today = formatDate(now)
    const logsKey = `${STORAGE_KEYS.NOTIFICATION_LOGS_PREFIX}${today}`

    // Lấy logs hiện tại
    let logs = []
    const logsJson = await AsyncStorage.getItem(logsKey)
    if (logsJson) {
      logs = JSON.parse(logsJson)
    }

    // Thêm log mới
    logs.push({
      id: Date.now().toString(),
      timestamp: now.getTime(),
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    })

    // Lưu logs
    await AsyncStorage.setItem(logsKey, JSON.stringify(logs))
  } catch (error) {
    console.error("Error logging notification:", error)
  }
}

export default {
  setupNotifications,
  scheduleNoteReminder,
  cancelNoteReminder,
  scheduleShiftReminder,
  cancelShiftReminder,
}
