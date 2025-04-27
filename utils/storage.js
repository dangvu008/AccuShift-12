import AsyncStorage from "@react-native-async-storage/async-storage"
import { secureStore, secureRetrieve } from "./security"
import { STORAGE_KEYS } from "../config/appConfig"

/**
 * Lớp quản lý lưu trữ dữ liệu cho ứng dụng
 * Cung cấp các phương thức để đọc/ghi dữ liệu vào AsyncStorage với kiểm tra tính toàn vẹn
 */
class StorageManager {
  /**
   * Khởi tạo lưu trữ với dữ liệu mặc định nếu chưa tồn tại
   */
  async initialize() {
    try {
      // Khởi tạo cài đặt người dùng
      const userSettings = await this.getUserSettings()
      if (!userSettings) {
        await this.setUserSettings({
          language: "vi",
          theme: "dark",
          multiButtonMode: "full", // 'full' hoặc 'simple'
          alarmSoundEnabled: true,
          alarmVibrationEnabled: true,
          weatherWarningEnabled: true,
          weatherLocation: {
            lat: 21.0278,
            lon: 105.8342,
            name: "Hà Nội",
          },
          weatherCheckTimeOffset: 60, // phút
          changeShiftReminderMode: "auto", // 'auto', 'manual', 'off'
          timeFormat: "24h", // '12h' hoặc '24h'
          firstDayOfWeek: "Mon", // 'Mon' hoặc 'Sun'
          showOnboarding: true,
          lastAppVersion: "1.0.0",
        })
      }

      // Khởi tạo danh sách ca làm việc
      const shifts = await this.getShifts()
      if (!shifts || shifts.length === 0) {
        await this.setShifts([
          {
            id: "shift_1",
            name: "Ca Hành Chính",
            startTime: "08:00",
            officeEndTime: "17:00",
            endTime: "17:30",
            departureTime: "07:30",
            daysApplied: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            remindBeforeStart: 15,
            remindAfterEnd: 15,
            showPunch: false,
            breakMinutes: 60,
            penaltyRoundingMinutes: 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "shift_2",
            name: "Ca Sáng",
            startTime: "06:00",
            officeEndTime: "14:00",
            endTime: "14:30",
            departureTime: "05:30",
            daysApplied: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            remindBeforeStart: 15,
            remindAfterEnd: 15,
            showPunch: false,
            breakMinutes: 30,
            penaltyRoundingMinutes: 15,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "shift_3",
            name: "Ca Chiều",
            startTime: "14:00",
            officeEndTime: "22:00",
            endTime: "22:30",
            departureTime: "13:30",
            daysApplied: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            remindBeforeStart: 15,
            remindAfterEnd: 15,
            showPunch: false,
            breakMinutes: 30,
            penaltyRoundingMinutes: 15,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ])
      }

      // Khởi tạo các cấu trúc dữ liệu khác nếu cần
      await this.ensureNotesInitialized()
      await this.ensureAttendanceLogsInitialized()
      await this.ensureDailyWorkStatusInitialized()
      await this.ensureWeatherCacheInitialized()

      return true
    } catch (error) {
      console.error("Lỗi khởi tạo lưu trữ:", error)
      return false
    }
  }

  /**
   * Lấy cài đặt người dùng
   * @returns {Promise<Object|null>} Cài đặt người dùng hoặc null nếu có lỗi
   */
  async getUserSettings() {
    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS)
      if (!settingsJson) return null

      const settings = JSON.parse(settingsJson)
      return settings
    } catch (error) {
      console.error("Lỗi khi lấy cài đặt người dùng:", error)
      return null
    }
  }

  /**
   * Lưu cài đặt người dùng
   * @param {Object} settings Cài đặt người dùng
   * @returns {Promise<boolean>} Kết quả lưu
   */
  async setUserSettings(settings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings))
      return true
    } catch (error) {
      console.error("Lỗi khi lưu cài đặt người dùng:", error)
      return false
    }
  }

  /**
   * Cập nhật một phần cài đặt người dùng
   * @param {Object} partialSettings Phần cài đặt cần cập nhật
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  async updateUserSettings(partialSettings) {
    try {
      const currentSettings = (await this.getUserSettings()) || {}
      const updatedSettings = { ...currentSettings, ...partialSettings }
      return await this.setUserSettings(updatedSettings)
    } catch (error) {
      console.error("Lỗi khi cập nhật cài đặt người dùng:", error)
      return false
    }
  }

  /**
   * Lấy danh sách ca làm việc
   * @returns {Promise<Array|null>} Danh sách ca làm việc hoặc null nếu có lỗi
   */
  async getShifts() {
    try {
      const shiftsJson = await AsyncStorage.getItem(STORAGE_KEYS.SHIFT_LIST)
      if (!shiftsJson) return []

      const shifts = JSON.parse(shiftsJson)
      return Array.isArray(shifts) ? shifts : []
    } catch (error) {
      console.error("Lỗi khi lấy danh sách ca làm việc:", error)
      return []
    }
  }

  /**
   * Lưu danh sách ca làm việc
   * @param {Array} shifts Danh sách ca làm việc
   * @returns {Promise<boolean>} Kết quả lưu
   */
  async setShifts(shifts) {
    try {
      if (!Array.isArray(shifts)) {
        console.error("Dữ liệu ca làm việc không hợp lệ")
        return false
      }

      await AsyncStorage.setItem(STORAGE_KEYS.SHIFT_LIST, JSON.stringify(shifts))
      return true
    } catch (error) {
      console.error("Lỗi khi lưu danh sách ca làm việc:", error)
      return false
    }
  }

  /**
   * Lấy ca làm việc theo ID
   * @param {string} id ID ca làm việc
   * @returns {Promise<Object|null>} Ca làm việc hoặc null nếu không tìm thấy
   */
  async getShiftById(id) {
    try {
      const shifts = await this.getShifts()
      return shifts.find((shift) => shift.id === id) || null
    } catch (error) {
      console.error("Lỗi khi lấy ca làm việc theo ID:", error)
      return null
    }
  }

  /**
   * Thêm ca làm việc mới
   * @param {Object} shift Ca làm việc mới
   * @returns {Promise<Object|null>} Ca làm việc đã thêm hoặc null nếu có lỗi
   */
  async addShift(shift) {
    try {
      const shifts = await this.getShifts()

      // Tạo ID nếu chưa có
      const newShift = {
        ...shift,
        id: shift.id || `shift_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      shifts.push(newShift)
      await this.setShifts(shifts)
      return newShift
    } catch (error) {
      console.error("Lỗi khi thêm ca làm việc:", error)
      return null
    }
  }

  /**
   * Cập nhật ca làm việc
   * @param {Object} updatedShift Ca làm việc đã cập nhật
   * @returns {Promise<Object|null>} Ca làm việc đã cập nhật hoặc null nếu có lỗi
   */
  async updateShift(updatedShift) {
    try {
      const shifts = await this.getShifts()
      const index = shifts.findIndex((shift) => shift.id === updatedShift.id)

      if (index === -1) {
        console.error("Không tìm thấy ca làm việc cần cập nhật")
        return null
      }

      // Cập nhật thời gian sửa đổi
      updatedShift.updatedAt = new Date().toISOString()

      shifts[index] = updatedShift
      await this.setShifts(shifts)
      return updatedShift
    } catch (error) {
      console.error("Lỗi khi cập nhật ca làm việc:", error)
      return null
    }
  }

  /**
   * Xóa ca làm việc
   * @param {string} id ID ca làm việc cần xóa
   * @returns {Promise<boolean>} Kết quả xóa
   */
  async deleteShift(id) {
    try {
      const shifts = await this.getShifts()
      const filteredShifts = shifts.filter((shift) => shift.id !== id)

      if (filteredShifts.length === shifts.length) {
        console.error("Không tìm thấy ca làm việc cần xóa")
        return false
      }

      await this.setShifts(filteredShifts)

      // Nếu ca đang được áp dụng bị xóa, cập nhật activeShiftId
      const activeShiftId = await this.getActiveShiftId()
      if (activeShiftId === id) {
        await this.setActiveShiftId(null)
      }

      return true
    } catch (error) {
      console.error("Lỗi khi xóa ca làm việc:", error)
      return false
    }
  }

  /**
   * Lấy ID ca làm việc đang được áp dụng
   * @returns {Promise<string|null>} ID ca làm việc hoặc null nếu không có
   */
  async getActiveShiftId() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT_ID)
    } catch (error) {
      console.error("Lỗi khi lấy ID ca làm việc đang áp dụng:", error)
      return null
    }
  }

  /**
   * Đặt ID ca làm việc đang được áp dụng
   * @param {string|null} id ID ca làm việc hoặc null để xóa
   * @returns {Promise<boolean>} Kết quả đặt
   */
  async setActiveShiftId(id) {
    try {
      if (id) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFT_ID, id)
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_ID)
      }
      return true
    } catch (error) {
      console.error("Lỗi khi đặt ID ca làm việc đang áp dụng:", error)
      return false
    }
  }

  /**
   * Lấy ca làm việc đang được áp dụng
   * @returns {Promise<Object|null>} Ca làm việc hoặc null nếu không có
   */
  async getActiveShift() {
    try {
      const activeShiftId = await this.getActiveShiftId()
      if (!activeShiftId) return null

      return await this.getShiftById(activeShiftId)
    } catch (error) {
      console.error("Lỗi khi lấy ca làm việc đang áp dụng:", error)
      return null
    }
  }

  /**
   * Lấy log chấm công theo ngày
   * @param {string} date Ngày cần lấy log (định dạng YYYY-MM-DD)
   * @returns {Promise<Array>} Danh sách log chấm công
   */
  async getAttendanceLogs(date) {
    try {
      const key = `${STORAGE_KEYS.ATTENDANCE_LOGS_PREFIX}${date}`
      const logsJson = await AsyncStorage.getItem(key)

      if (!logsJson) return []

      const logs = JSON.parse(logsJson)
      return Array.isArray(logs) ? logs : []
    } catch (error) {
      console.error(`Lỗi khi lấy log chấm công ngày ${date}:`, error)
      return []
    }
  }

  /**
   * Lưu log chấm công theo ngày
   * @param {string} date Ngày cần lưu log (định dạng YYYY-MM-DD)
   * @param {Array} logs Danh sách log chấm công
   * @returns {Promise<boolean>} Kết quả lưu
   */
  async setAttendanceLogs(date, logs) {
    try {
      if (!Array.isArray(logs)) {
        console.error("Dữ liệu log chấm công không hợp lệ")
        return false
      }

      const key = `${STORAGE_KEYS.ATTENDANCE_LOGS_PREFIX}${date}`
      await AsyncStorage.setItem(key, JSON.stringify(logs))
      return true
    } catch (error) {
      console.error(`Lỗi khi lưu log chấm công ngày ${date}:`, error)
      return false
    }
  }

  /**
   * Thêm log chấm công mới
   * @param {string} date Ngày cần thêm log (định dạng YYYY-MM-DD)
   * @param {Object} log Log chấm công mới
   * @returns {Promise<Object|null>} Log đã thêm hoặc null nếu có lỗi
   */
  async addAttendanceLog(date, log) {
    try {
      const logs = await this.getAttendanceLogs(date)

      // Tạo ID nếu chưa có
      const newLog = {
        ...log,
        id: log.id || `log_${Date.now()}`,
        timestamp: log.timestamp || new Date().toISOString(),
      }

      logs.push(newLog)
      await this.setAttendanceLogs(date, logs)
      return newLog
    } catch (error) {
      console.error(`Lỗi khi thêm log chấm công ngày ${date}:`, error)
      return null
    }
  }

  /**
   * Xóa tất cả log chấm công của một ngày
   * @param {string} date Ngày cần xóa log (định dạng YYYY-MM-DD)
   * @returns {Promise<boolean>} Kết quả xóa
   */
  async clearAttendanceLogs(date) {
    try {
      const key = `${STORAGE_KEYS.ATTENDANCE_LOGS_PREFIX}${date}`
      await AsyncStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`Lỗi khi xóa log chấm công ngày ${date}:`, error)
      return false
    }
  }

  /**
   * Lấy trạng thái làm việc của một ngày
   * @param {string} date Ngày cần lấy trạng thái (định dạng YYYY-MM-DD)
   * @returns {Promise<Object|null>} Trạng thái làm việc hoặc null nếu không có
   */
  async getDailyWorkStatus(date) {
    try {
      const key = `${STORAGE_KEYS.DAILY_WORK_STATUS_PREFIX}${date}`
      const statusJson = await AsyncStorage.getItem(key)

      if (!statusJson) return null

      return JSON.parse(statusJson)
    } catch (error) {
      console.error(`Lỗi khi lấy trạng thái làm việc ngày ${date}:`, error)
      return null
    }
  }

  /**
   * Lưu trạng thái làm việc của một ngày
   * @param {string} date Ngày cần lưu trạng thái (định dạng YYYY-MM-DD)
   * @param {Object} status Trạng thái làm việc
   * @returns {Promise<boolean>} Kết quả lưu
   */
  async setDailyWorkStatus(date, status) {
    try {
      const key = `${STORAGE_KEYS.DAILY_WORK_STATUS_PREFIX}${date}`
      await AsyncStorage.setItem(key, JSON.stringify(status))
      return true
    } catch (error) {
      console.error(`Lỗi khi lưu trạng thái làm việc ngày ${date}:`, error)
      return false
    }
  }

  /**
   * Cập nhật một phần trạng thái làm việc của một ngày
   * @param {string} date Ngày cần cập nhật trạng thái (định dạng YYYY-MM-DD)
   * @param {Object} partialStatus Phần trạng thái cần cập nhật
   * @returns {Promise<Object|null>} Trạng thái đã cập nhật hoặc null nếu có lỗi
   */
  async updateDailyWorkStatus(date, partialStatus) {
    try {
      const currentStatus = (await this.getDailyWorkStatus(date)) || {}
      const updatedStatus = {
        ...currentStatus,
        ...partialStatus,
        updatedAt: new Date().toISOString(),
      }

      await this.setDailyWorkStatus(date, updatedStatus)
      return updatedStatus
    } catch (error) {
      console.error(`Lỗi khi cập nhật trạng thái làm việc ngày ${date}:`, error)
      return null
    }
  }

  /**
   * Lấy danh sách ghi chú
   * @returns {Promise<Array>} Danh sách ghi chú
   */
  async getNotes() {
    try {
      const notesJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTES)

      if (!notesJson) return []

      const notes = JSON.parse(notesJson)
      return Array.isArray(notes) ? notes : []
    } catch (error) {
      console.error("Lỗi khi lấy danh sách ghi chú:", error)
      return []
    }
  }

  /**
   * Lưu danh sách ghi chú
   * @param {Array} notes Danh sách ghi chú
   * @returns {Promise<boolean>} Kết quả lưu
   */
  async setNotes(notes) {
    try {
      if (!Array.isArray(notes)) {
        console.error("Dữ liệu ghi chú không hợp lệ")
        return false
      }

      await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes))
      return true
    } catch (error) {
      console.error("Lỗi khi lưu danh sách ghi chú:", error)
      return false
    }
  }

  /**
   * Lấy ghi chú theo ID
   * @param {string} id ID ghi chú
   * @returns {Promise<Object|null>} Ghi chú hoặc null nếu không tìm thấy
   */
  async getNoteById(id) {
    try {
      const notes = await this.getNotes()
      return notes.find((note) => note.id === id) || null
    } catch (error) {
      console.error("Lỗi khi lấy ghi chú theo ID:", error)
      return null
    }
  }

  /**
   * Thêm ghi chú mới
   * @param {Object} note Ghi chú mới
   * @returns {Promise<Object|null>} Ghi chú đã thêm hoặc null nếu có lỗi
   */
  async addNote(note) {
    try {
      const notes = await this.getNotes()

      // Tạo ID nếu chưa có
      const newNote = {
        ...note,
        id: note.id || `note_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAlarmEnabled: note.isAlarmEnabled !== false, // Mặc định là true
        lastRemindedAt: null,
      }

      notes.push(newNote)
      await this.setNotes(notes)
      return newNote
    } catch (error) {
      console.error("Lỗi khi thêm ghi chú:", error)
      return null
    }
  }

  /**
   * Cập nhật ghi chú
   * @param {Object} updatedNote Ghi chú đã cập nhật
   * @returns {Promise<Object|null>} Ghi chú đã cập nhật hoặc null nếu có lỗi
   */
  async updateNote(updatedNote) {
    try {
      const notes = await this.getNotes()
      const index = notes.findIndex((note) => note.id === updatedNote.id)

      if (index === -1) {
        console.error("Không tìm thấy ghi chú cần cập nhật")
        return null
      }

      // Cập nhật thời gian sửa đổi
      updatedNote.updatedAt = new Date().toISOString()

      notes[index] = updatedNote
      await this.setNotes(notes)
      return updatedNote
    } catch (error) {
      console.error("Lỗi khi cập nhật ghi chú:", error)
      return null
    }
  }

  /**
   * Xóa ghi chú
   * @param {string} id ID ghi chú cần xóa
   * @returns {Promise<boolean>} Kết quả xóa
   */
  async deleteNote(id) {
    try {
      const notes = await this.getNotes()
      const filteredNotes = notes.filter((note) => note.id !== id)

      if (filteredNotes.length === notes.length) {
        console.error("Không tìm thấy ghi chú cần xóa")
        return false
      }

      await this.setNotes(filteredNotes)
      return true
    } catch (error) {
      console.error("Lỗi khi xóa ghi chú:", error)
      return false
    }
  }

  /**
   * Cập nhật thời gian nhắc nhở gần nhất cho ghi chú
   * @param {string} id ID ghi chú
   * @param {string} timestamp Thời gian nhắc nhở (ISO 8601)
   * @returns {Promise<boolean>} Kết quả cập nhật
   */
  async updateNoteLastReminded(id, timestamp) {
    try {
      const notes = await this.getNotes()
      const index = notes.findIndex((note) => note.id === id)

      if (index === -1) {
        console.error("Không tìm thấy ghi chú cần cập nhật")
        return false
      }

      notes[index].lastRemindedAt = timestamp
      await this.setNotes(notes)
      return true
    } catch (error) {
      console.error("Lỗi khi cập nhật thời gian nhắc nhở ghi chú:", error)
      return false
    }
  }

  /**
   * Lấy thời gian reset tự động cuối cùng
   * @returns {Promise<string|null>} Thời gian reset (ISO 8601) hoặc null nếu chưa có
   */
  async getLastAutoResetTime() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_AUTO_RESET_TIME)
    } catch (error) {
      console.error("Lỗi khi lấy thời gian reset tự động cuối cùng:", error)
      return null
    }
  }

  /**
   * Đặt thời gian reset tự động cuối cùng
   * @param {string} timestamp Thời gian reset (ISO 8601)
   * @returns {Promise<boolean>} Kết quả đặt
   */
  async setLastAutoResetTime(timestamp) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_AUTO_RESET_TIME, timestamp)
      return true
    } catch (error) {
      console.error("Lỗi khi đặt thời gian reset tự động cuối cùng:", error)
      return false
    }
  }

  /**
   * Lấy trạng thái API key thời tiết
   * @returns {Promise<Object|null>} Trạng thái API key hoặc null nếu có lỗi
   */
  async getWeatherApiState() {
    try {
      const stateJson = await secureRetrieve(STORAGE_KEYS.WEATHER_API_STATE)
      return stateJson || null
    } catch (error) {
      console.error("Lỗi khi lấy trạng thái API key thời tiết:", error)
      return null
    }
  }

  /**
   * Lưu trạng thái API key thời tiết
   * @param {Object} state Trạng thái API key
   * @returns {Promise<boolean>} Kết quả lưu
   */
  async setWeatherApiState(state) {
    try {
      await secureStore(STORAGE_KEYS.WEATHER_API_STATE, state)
      return true
    } catch (error) {
      console.error("Lỗi khi lưu trạng thái API key thời tiết:", error)
      return false
    }
  }

  /**
   * Lấy cache dữ liệu thời tiết
   * @param {string} locationKey Khóa vị trí (lat_lon)
   * @returns {Promise<Object|null>} Cache dữ liệu thời tiết hoặc null nếu có lỗi
   */
  async getWeatherCache(locationKey) {
    try {
      const cacheKey = `${STORAGE_KEYS.WEATHER_CACHE_PREFIX}${locationKey}`
      const cacheJson = await AsyncStorage.getItem(cacheKey)

      if (!cacheJson) return null

      const cache = JSON.parse(cacheJson)

      // Kiểm tra hết hạn cache
      const now = Date.now()
      if (cache.timestamp && now - cache.timestamp > cache.ttl) {
        // Cache đã hết hạn
        return null
      }

      return cache.data
    } catch (error) {
      console.error("Lỗi khi lấy cache dữ liệu thời tiết:", error)
      return null
    }
  }

  /**
   * Lưu cache dữ liệu thời tiết
   * @param {string} locationKey Khóa vị trí (lat_lon)
   * @param {Object} data Dữ liệu thời tiết
   * @param {number} ttl Thời gian sống của cache (ms)
   * @returns {Promise<boolean>} Kết quả lưu
   */
  async setWeatherCache(locationKey, data, ttl = 24 * 60 * 60 * 1000) {
    try {
      const cacheKey = `${STORAGE_KEYS.WEATHER_CACHE_PREFIX}${locationKey}`
      const cache = {
        data,
        timestamp: Date.now(),
        ttl,
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache))
      return true
    } catch (error) {
      console.error("Lỗi khi lưu cache dữ liệu thời tiết:", error)
      return false
    }
  }

  /**
   * Xóa tất cả cache dữ liệu thời tiết
   * @returns {Promise<boolean>} Kết quả xóa
   */
  async clearWeatherCache() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const weatherCacheKeys = keys.filter((key) => key.startsWith(STORAGE_KEYS.WEATHER_CACHE_PREFIX))

      if (weatherCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(weatherCacheKeys)
      }

      return true
    } catch (error) {
      console.error("Lỗi khi xóa cache dữ liệu thời tiết:", error)
      return false
    }
  }

  /**
   * Đảm bảo cấu trúc ghi chú đã được khởi tạo
   * @returns {Promise<boolean>} Kết quả khởi tạo
   */
  async ensureNotesInitialized() {
    try {
      const notesJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTES)
      if (!notesJson) {
        await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify([]))
      }
      return true
    } catch (error) {
      console.error("Lỗi khi khởi tạo cấu trúc ghi chú:", error)
      return false
    }
  }

  /**
   * Đảm bảo cấu trúc log chấm công đã được khởi tạo
   * @returns {Promise<boolean>} Kết quả khởi tạo
   */
  async ensureAttendanceLogsInitialized() {
    // Không cần khởi tạo gì đặc biệt vì log chấm công được lưu theo ngày
    return true
  }

  /**
   * Đảm bảo cấu trúc trạng thái làm việc hàng ngày đã được khởi tạo
   * @returns {Promise<boolean>} Kết quả khởi tạo
   */
  async ensureDailyWorkStatusInitialized() {
    // Không cần khởi tạo gì đặc biệt vì trạng thái làm việc được lưu theo ngày
    return true
  }

  /**
   * Đảm bảo cấu trúc cache thời tiết đã được khởi tạo
   * @returns {Promise<boolean>} Kết quả khởi tạo
   */
  async ensureWeatherCacheInitialized() {
    // Không cần khởi tạo gì đặc biệt vì cache thời tiết được lưu theo vị trí
    return true
  }

  /**
   * Xóa tất cả dữ liệu
   * @returns {Promise<boolean>} Kết quả xóa
   */
  async clearAllData() {
    try {
      await AsyncStorage.clear()
      return true
    } catch (error) {
      console.error("Lỗi khi xóa tất cả dữ liệu:", error)
      return false
    }
  }

  /**
   * Sao lưu tất cả dữ liệu
   * @returns {Promise<Object|null>} Dữ liệu sao lưu hoặc null nếu có lỗi
   */
  async backupData() {
    try {
      // Lấy tất cả khóa
      const keys = await AsyncStorage.getAllKeys()

      // Lấy tất cả dữ liệu
      const keyValuePairs = await AsyncStorage.multiGet(keys)

      // Chuyển đổi thành đối tượng
      const backupData = {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        data: {},
      }

      keyValuePairs.forEach(([key, value]) => {
        if (value) {
          try {
            // Cố gắng parse JSON
            backupData.data[key] = JSON.parse(value)
          } catch {
            // Nếu không phải JSON, lưu dưới dạng chuỗi
            backupData.data[key] = value
          }
        }
      })

      // Thêm dữ liệu bảo mật (nếu có)
      try {
        const weatherApiState = await this.getWeatherApiState()
        if (weatherApiState) {
          backupData.data[STORAGE_KEYS.WEATHER_API_STATE] = weatherApiState
        }
      } catch (error) {
        console.warn("Không thể sao lưu dữ liệu bảo mật:", error)
      }

      return backupData
    } catch (error) {
      console.error("Lỗi khi sao lưu dữ liệu:", error)
      return null
    }
  }

  /**
   * Khôi phục dữ liệu từ bản sao lưu
   * @param {Object} backupData Dữ liệu sao lưu
   * @returns {Promise<boolean>} Kết quả khôi phục
   */
  async restoreData(backupData) {
    try {
      if (!backupData || !backupData.data) {
        console.error("Dữ liệu sao lưu không hợp lệ")
        return false
      }

      // Xóa tất cả dữ liệu hiện tại
      await AsyncStorage.clear()

      // Khôi phục từng mục dữ liệu
      for (const [key, value] of Object.entries(backupData.data)) {
        if (value) {
          // Bỏ qua dữ liệu bảo mật, sẽ xử lý riêng
          if (key === STORAGE_KEYS.WEATHER_API_STATE) continue

          await AsyncStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value))
        }
      }

      // Khôi phục dữ liệu bảo mật (nếu có)
      if (backupData.data[STORAGE_KEYS.WEATHER_API_STATE]) {
        await this.setWeatherApiState(backupData.data[STORAGE_KEYS.WEATHER_API_STATE])
      }

      return true
    } catch (error) {
      console.error("Lỗi khi khôi phục dữ liệu:", error)
      return false
    }
  }
}

// Xuất một thể hiện duy nhất của StorageManager
export const storage = new StorageManager()

export default storage
