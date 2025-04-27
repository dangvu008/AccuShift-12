import * as Notifications from 'expo-notifications'
// Mock Battery API since expo-battery is not available in Snack
const Battery = {
  isBatteryOptimizationEnabledAsync: async () => false,
}
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NOTIFICATION_CONFIG } from '../config/appConfig'
import { logNotification } from './notifications'

/**
 * Lớp quản lý báo thức với độ tin cậy cao
 * Cung cấp các phương thức để lên lịch, hủy và quản lý báo thức
 */
class AlarmManager {
  constructor() {
    this.hasPermission = false
    this.hasCriticalPermission = false
    this.hasBatteryOptimizationDisabled = false
    this.initialized = false
  }

  /**
   * Khởi tạo AlarmManager và kiểm tra các quyền cần thiết
   */
  async initialize() {
    if (this.initialized) return

    // Kiểm tra quyền thông báo
    const { status } = await Notifications.getPermissionsAsync()
    this.hasPermission = status === 'granted'

    // Kiểm tra quyền thông báo quan trọng (iOS)
    if (Platform.OS === 'ios') {
      const settings = await Notifications.getPermissionsAsync()
      this.hasCriticalPermission = settings.ios?.allowsCriticalAlerts || false
    }

    // Kiểm tra tối ưu hóa pin (Android)
    if (Platform.OS === 'android') {
      try {
        // Trên thiết bị thực, sử dụng thư viện như react-native-battery-optimization-check
        // Đây chỉ là mã giả để mô phỏng chức năng
        const batteryOptimizationStatus =
          await Battery.isBatteryOptimizationEnabledAsync()
        this.hasBatteryOptimizationDisabled = !batteryOptimizationStatus
      } catch (error) {
        console.warn('Không thể kiểm tra trạng thái tối ưu hóa pin:', error)
        this.hasBatteryOptimizationDisabled = false
      }
    }

    // Cấu hình kênh thông báo cho Android
    if (Platform.OS === 'android') {
      await this._setupNotificationChannels()
    }

    this.initialized = true
    return {
      hasPermission: this.hasPermission,
      hasCriticalPermission: this.hasCriticalPermission,
      hasBatteryOptimizationDisabled: this.hasBatteryOptimizationDisabled,
    }
  }

  /**
   * Thiết lập các kênh thông báo cho Android
   * @private
   */
  async _setupNotificationChannels() {
    // Kênh báo thức chính
    await Notifications.setNotificationChannelAsync(
      NOTIFICATION_CONFIG.CHANNEL_ID,
      {
        name: NOTIFICATION_CONFIG.CHANNEL_NAME,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: NOTIFICATION_CONFIG.VIBRATION_PATTERN,
        lightColor: NOTIFICATION_CONFIG.LIGHT_COLOR,
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // Bỏ qua chế độ Không làm phiền
      }
    )

    // Kênh nhắc nhở ca làm việc
    await Notifications.setNotificationChannelAsync('shift_reminders', {
      name: 'Nhắc nhở ca làm việc',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: NOTIFICATION_CONFIG.VIBRATION_PATTERN,
      lightColor: NOTIFICATION_CONFIG.LIGHT_COLOR,
      sound: 'default',
    })

    // Kênh nhắc nhở ghi chú
    await Notifications.setNotificationChannelAsync('note_reminders', {
      name: 'Nhắc nhở ghi chú',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: NOTIFICATION_CONFIG.VIBRATION_PATTERN,
      lightColor: NOTIFICATION_CONFIG.LIGHT_COLOR,
      sound: 'default',
    })
  }

  /**
   * Yêu cầu quyền thông báo
   * @returns {Promise<boolean>} Kết quả yêu cầu quyền
   */
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
          // Yêu cầu quyền thông báo quan trọng nếu có thể
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
        },
      })

      this.hasPermission = status === 'granted'

      // Kiểm tra quyền thông báo quan trọng (iOS)
      if (Platform.OS === 'ios' && status === 'granted') {
        const settings = await Notifications.getPermissionsAsync()
        this.hasCriticalPermission = settings.ios?.allowsCriticalAlerts || false
      }

      return this.hasPermission
    } catch (error) {
      console.error('Lỗi khi yêu cầu quyền thông báo:', error)
      return false
    }
  }

  /**
   * Yêu cầu tắt tối ưu hóa pin (Android)
   * Trong ứng dụng thực tế, cần mở màn hình cài đặt để người dùng tắt thủ công
   * @returns {Promise<boolean>} Kết quả yêu cầu
   */
  async requestDisableBatteryOptimization() {
    if (Platform.OS !== 'android') return true

    try {
      // Trong ứng dụng thực tế, sử dụng thư viện như react-native-battery-optimization-check
      // để mở màn hình cài đặt tối ưu hóa pin
      console.log('Yêu cầu tắt tối ưu hóa pin')

      // Mã giả - trong ứng dụng thực tế, cần mở màn hình cài đặt
      this.hasBatteryOptimizationDisabled = true
      return true
    } catch (error) {
      console.error('Lỗi khi yêu cầu tắt tối ưu hóa pin:', error)
      return false
    }
  }

  /**
   * Lên lịch báo thức với độ tin cậy cao
   * @param {Object} options Tùy chọn báo thức
   * @param {string} options.title Tiêu đề báo thức
   * @param {string} options.body Nội dung báo thức
   * @param {Date} options.scheduledTime Thời gian lên lịch
   * @param {string} options.type Loại báo thức ('shift', 'note', 'check_in', 'check_out')
   * @param {string} options.id ID duy nhất cho báo thức
   * @param {Object} options.data Dữ liệu bổ sung
   * @param {boolean} options.repeats Có lặp lại không
   * @param {number} options.weekday Ngày trong tuần (1-7, nếu lặp lại)
   * @returns {Promise<string>} ID của thông báo đã lên lịch
   */
  async scheduleAlarm({
    title,
    body,
    scheduledTime,
    type,
    id,
    data = {},
    repeats = false,
    weekday = null,
  }) {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.hasPermission) {
      const granted = await this.requestPermissions()
      if (!granted) {
        throw new Error('Không có quyền thông báo')
      }
    }

    // Xác định kênh thông báo dựa trên loại
    let channelId = NOTIFICATION_CONFIG.CHANNEL_ID
    if (type === 'shift') {
      channelId = 'shift_reminders'
    } else if (type === 'note') {
      channelId = 'note_reminders'
    }

    // Tạo nội dung thông báo
    const notificationContent = {
      title: this._formatAlarmTitle(title, type),
      body,
      data: {
        isAlarm: true,
        type,
        id,
        title,
        message: body,
        time: scheduledTime.toISOString(),
        ...data,
      },
      sound: true,
      vibrate: true,
      priority: 'high',
      channelId,
    }

    // Tạo trigger
    let trigger = { date: scheduledTime }

    // Nếu lặp lại theo ngày trong tuần
    if (repeats && weekday) {
      trigger = {
        weekday,
        hour: scheduledTime.getHours(),
        minute: scheduledTime.getMinutes(),
        repeats: true,
      }
    }

    // Cấu hình đặc biệt cho Android
    if (Platform.OS === 'android') {
      // Sử dụng full-screen intent cho báo thức quan trọng
      if (type === 'check_in' || type === 'check_out') {
        notificationContent.android = {
          ...notificationContent.android,
          channelId: NOTIFICATION_CONFIG.CHANNEL_ID,
          priority: 'max',
          fullScreenIntent: true,
        }
      }
    }

    // Lên lịch thông báo
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
      identifier: id,
    })

    // Lưu thông tin báo thức để theo dõi
    await this._saveScheduledAlarm({
      id: notificationId,
      title,
      body,
      scheduledTime: scheduledTime.toISOString(),
      type,
      data,
      repeats,
      weekday,
    })

    return notificationId
  }

  /**
   * Định dạng tiêu đề báo thức dựa trên loại
   * @param {string} title Tiêu đề gốc
   * @param {string} type Loại báo thức
   * @returns {string} Tiêu đề đã định dạng
   * @private
   */
  _formatAlarmTitle(title, type) {
    switch (type) {
      case 'check_in':
        return '⏰ CHECK-IN! ' + title
      case 'check_out':
        return '⏰ CHECK-OUT! ' + title
      case 'shift':
        return '⏰ ĐẾN GIỜ ĐI LÀM! ' + title
      case 'note':
        return '📝 NHẮC VIỆC! ' + title
      default:
        return '⏰ ' + title
    }
  }

  /**
   * Lưu thông tin báo thức đã lên lịch
   * @param {Object} alarm Thông tin báo thức
   * @private
   */
  async _saveScheduledAlarm(alarm) {
    try {
      const scheduledAlarmsJson = await AsyncStorage.getItem('scheduled_alarms')
      const scheduledAlarms = scheduledAlarmsJson
        ? JSON.parse(scheduledAlarmsJson)
        : []

      // Thêm báo thức mới
      scheduledAlarms.push(alarm)

      // Lưu danh sách báo thức
      await AsyncStorage.setItem(
        'scheduled_alarms',
        JSON.stringify(scheduledAlarms)
      )
    } catch (error) {
      console.error('Lỗi khi lưu thông tin báo thức:', error)
    }
  }

  /**
   * Xóa thông tin báo thức đã lên lịch
   * @param {string} alarmId ID báo thức
   * @private
   */
  async _removeScheduledAlarm(alarmId) {
    try {
      const scheduledAlarmsJson = await AsyncStorage.getItem('scheduled_alarms')
      if (!scheduledAlarmsJson) return

      let scheduledAlarms = JSON.parse(scheduledAlarmsJson)

      // Lọc bỏ báo thức cần xóa
      scheduledAlarms = scheduledAlarms.filter((alarm) => alarm.id !== alarmId)

      // Lưu danh sách báo thức
      await AsyncStorage.setItem(
        'scheduled_alarms',
        JSON.stringify(scheduledAlarms)
      )
    } catch (error) {
      console.error('Lỗi khi xóa thông tin báo thức:', error)
    }
  }

  /**
   * Hủy báo thức đã lên lịch
   * @param {string} alarmId ID báo thức
   * @returns {Promise<boolean>} Kết quả hủy báo thức
   */
  async cancelAlarm(alarmId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(alarmId)
      await this._removeScheduledAlarm(alarmId)
      return true
    } catch (error) {
      console.error('Lỗi khi hủy báo thức:', error)
      return false
    }
  }

  /**
   * Hủy tất cả báo thức có tiền tố ID nhất định
   * @param {string} idPrefix Tiền tố ID báo thức
   * @returns {Promise<boolean>} Kết quả hủy báo thức
   */
  async cancelAlarmsByPrefix(idPrefix) {
    try {
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync()

      // Lọc các thông báo có ID bắt đầu bằng tiền tố
      const matchingNotifications = scheduledNotifications.filter(
        (notification) => notification.identifier.startsWith(idPrefix)
      )

      // Hủy từng thông báo
      for (const notification of matchingNotifications) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        )
        await this._removeScheduledAlarm(notification.identifier)
      }

      return true
    } catch (error) {
      console.error('Lỗi khi hủy báo thức theo tiền tố:', error)
      return false
    }
  }

  /**
   * Lên lịch báo lại sau một khoảng thời gian
   * @param {Object} originalAlarm Thông tin báo thức gốc
   * @param {number} delayMinutes Số phút trì hoãn
   * @returns {Promise<string>} ID của báo thức mới
   */
  async snoozeAlarm(originalAlarm, delayMinutes = 5) {
    try {
      // Tính thời gian báo lại
      const now = new Date()
      const snoozeTime = new Date(now.getTime() + delayMinutes * 60 * 1000)

      // Tạo ID mới cho báo thức báo lại
      const snoozeId = `${originalAlarm.id}_snooze_${Date.now()}`

      // Lên lịch báo thức mới
      return await this.scheduleAlarm({
        title: originalAlarm.title,
        body: `[BÁO LẠI] ${originalAlarm.body}`,
        scheduledTime: snoozeTime,
        type: originalAlarm.type,
        id: snoozeId,
        data: originalAlarm.data,
      })
    } catch (error) {
      console.error('Lỗi khi báo lại báo thức:', error)
      return null
    }
  }

  /**
   * Lấy danh sách tất cả báo thức đã lên lịch
   * @returns {Promise<Array>} Danh sách báo thức
   */
  async getAllScheduledAlarms() {
    try {
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync()
      return scheduledNotifications.map((notification) => ({
        id: notification.identifier,
        title: notification.content.title,
        body: notification.content.body,
        data: notification.content.data,
        trigger: notification.trigger,
      }))
    } catch (error) {
      console.error('Lỗi khi lấy danh sách báo thức:', error)
      return []
    }
  }

  /**
   * Xử lý khi nhận thông báo báo thức
   * @param {Object} notification Thông báo
   */
  async handleAlarmNotification(notification) {
    try {
      const data = notification.request.content.data

      // Ghi log thông báo
      await logNotification(notification)

      // Xử lý theo loại báo thức
      if (data.isAlarm) {
        // Trong ứng dụng thực tế, có thể thực hiện các hành động bổ sung
        // như mở màn hình báo thức, phát âm thanh, v.v.
        console.log('Đã nhận báo thức:', data.type)
      }
    } catch (error) {
      console.error('Lỗi khi xử lý thông báo báo thức:', error)
    }
  }

  /**
   * Lên lịch báo thức check-in
   * @param {Object} shift Thông tin ca làm việc
   * @param {Date} scheduledTime Thời gian lên lịch
   * @returns {Promise<string>} ID của báo thức
   */
  async scheduleCheckInAlarm(shift, scheduledTime) {
    return this.scheduleAlarm({
      title: shift.name,
      body: `Đã đến giờ check-in ca ${shift.name} (${shift.startTime})`,
      scheduledTime,
      type: 'check_in',
      id: `check_in_${shift.id}_${Date.now()}`,
      data: { shiftId: shift.id, action: 'check_in' },
    })
  }

  /**
   * Lên lịch báo thức check-out
   * @param {Object} shift Thông tin ca làm việc
   * @param {Date} scheduledTime Thời gian lên lịch
   * @returns {Promise<string>} ID của báo thức
   */
  async scheduleCheckOutAlarm(shift, scheduledTime) {
    return this.scheduleAlarm({
      title: shift.name,
      body: `Đã đến giờ check-out ca ${shift.name} (${shift.endTime})`,
      scheduledTime,
      type: 'check_out',
      id: `check_out_${shift.id}_${Date.now()}`,
      data: { shiftId: shift.id, action: 'check_out' },
    })
  }
}

// Tạo và xuất instance duy nhất
const alarmManager = new AlarmManager()
export default alarmManager
