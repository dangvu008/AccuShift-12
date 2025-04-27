import { WORK_STATUS } from "../config/appConfig"
import { storage } from "./storage"
import { formatDate } from "./helpers"

/**
 * Tính toán trạng thái làm việc cho một ngày cụ thể
 * @param {string} date Ngày cần tính toán (định dạng YYYY-MM-DD)
 * @param {Object} shift Ca làm việc áp dụng
 * @returns {Promise<Object>} Trạng thái làm việc đã tính toán
 */
export const calculateDailyWorkStatus = async (date, shift) => {
  try {
    // Lấy log chấm công của ngày
    const logs = await storage.getAttendanceLogs(date)

    // Nếu không có log nào, trả về trạng thái chưa cập nhật
    if (!logs || logs.length === 0) {
      return {
        date,
        status: WORK_STATUS.CHUA_CAP_NHAT,
        shiftId: shift?.id,
        shiftName: shift?.name,
        checkInTime: null,
        checkOutTime: null,
        workMinutes: 0,
        breakMinutes: shift?.breakMinutes || 0,
        otMinutes: 0,
        lateMinutes: 0,
        earlyMinutes: 0,
        isManuallyUpdated: false,
        calculatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    // Tìm log check-in và check-out
    const goWorkLog = logs.find((log) => log.type === "go_work")
    const checkInLog = logs.find((log) => log.type === "check_in")
    const checkOutLog = logs.find((log) => log.type === "check_out")
    const completeLog = logs.find((log) => log.type === "complete")

    // Thời gian check-in và check-out
    const checkInTime = checkInLog ? new Date(checkInLog.timestamp) : null
    const checkOutTime = checkOutLog ? new Date(checkOutLog.timestamp) : null

    // Khởi tạo trạng thái mặc định
    let status = WORK_STATUS.CHUA_CAP_NHAT
    let workMinutes = 0
    let otMinutes = 0
    let lateMinutes = 0
    let earlyMinutes = 0

    // Nếu có cả check-in và check-out, tính toán thời gian làm việc
    if (checkInTime && checkOutTime) {
      // Tính thời gian làm việc (phút)
      const workDurationMs = checkOutTime.getTime() - checkInTime.getTime()
      workMinutes = Math.floor(workDurationMs / (1000 * 60))

      // Trừ thời gian nghỉ
      const breakMinutes = shift?.breakMinutes || 0
      workMinutes = Math.max(0, workMinutes - breakMinutes)

      // Nếu có thông tin ca làm việc, tính toán chi tiết hơn
      if (shift) {
        // Parse thời gian ca làm việc
        const [startHour, startMinute] = shift.startTime.split(":").map(Number)
        const [endHour, endMinute] = shift.officeEndTime.split(":").map(Number)

        // Tạo đối tượng Date cho thời gian bắt đầu và kết thúc ca
        const shiftStartTime = new Date(checkInTime)
        shiftStartTime.setHours(startHour, startMinute, 0, 0)

        const shiftEndTime = new Date(checkInTime)
        shiftEndTime.setHours(endHour, endMinute, 0, 0)

        // Nếu thời gian kết thúc ca nhỏ hơn thời gian bắt đầu, đó là ca qua đêm
        if (shiftEndTime < shiftStartTime) {
          shiftEndTime.setDate(shiftEndTime.getDate() + 1)
        }

        // Tính thời gian ca làm việc chuẩn (phút)
        const shiftDurationMs = shiftEndTime.getTime() - shiftStartTime.getTime()
        const shiftDurationMinutes = Math.floor(shiftDurationMs / (1000 * 60))

        // Kiểm tra đi muộn
        if (checkInTime > shiftStartTime) {
          const lateMs = checkInTime.getTime() - shiftStartTime.getTime()
          lateMinutes = Math.floor(lateMs / (1000 * 60))

          // Làm tròn phút phạt
          if (shift.penaltyRoundingMinutes > 0) {
            lateMinutes = Math.ceil(lateMinutes / shift.penaltyRoundingMinutes) * shift.penaltyRoundingMinutes
          }
        }

        // Kiểm tra về sớm
        if (checkOutTime < shiftEndTime) {
          const earlyMs = shiftEndTime.getTime() - checkOutTime.getTime()
          earlyMinutes = Math.floor(earlyMs / (1000 * 60))

          // Làm tròn phút phạt
          if (shift.penaltyRoundingMinutes > 0) {
            earlyMinutes = Math.ceil(earlyMinutes / shift.penaltyRoundingMinutes) * shift.penaltyRoundingMinutes
          }
        }

        // Tính thời gian OT
        if (shift.endTime && shift.endTime !== shift.officeEndTime) {
          const [maxEndHour, maxEndMinute] = shift.endTime.split(":").map(Number)

          const maxEndTime = new Date(checkInTime)
          maxEndTime.setHours(maxEndHour, maxEndMinute, 0, 0)

          // Nếu thời gian kết thúc tối đa nhỏ hơn thời gian bắt đầu, đó là ca qua đêm
          if (maxEndTime < shiftStartTime) {
            maxEndTime.setDate(maxEndTime.getDate() + 1)
          }

          // Nếu check-out sau thời gian kết thúc ca chuẩn, tính OT
          if (checkOutTime > shiftEndTime) {
            // Giới hạn thời gian OT đến thời gian kết thúc tối đa
            const otEndTime = checkOutTime < maxEndTime ? checkOutTime : maxEndTime

            const otMs = otEndTime.getTime() - shiftEndTime.getTime()
            otMinutes = Math.floor(otMs / (1000 * 60))
          }
        }

        // Xác định trạng thái
        if (lateMinutes > 0 && earlyMinutes > 0) {
          status = WORK_STATUS.DI_MUON_VE_SOM
        } else if (lateMinutes > 0) {
          status = WORK_STATUS.DI_MUON
        } else if (earlyMinutes > 0) {
          status = WORK_STATUS.VE_SOM
        } else {
          status = WORK_STATUS.DU_CONG
        }
      } else {
        // Không có thông tin ca làm việc, mặc định là đủ công
        status = WORK_STATUS.DU_CONG
      }
    } else if (checkInTime && !checkOutTime) {
      // Có check-in nhưng không có check-out

      // Kiểm tra xem đã qua thời gian dài chưa (> 16 giờ)
      const now = new Date()
      const timeSinceCheckIn = now.getTime() - checkInTime.getTime()
      const hoursSinceCheckIn = timeSinceCheckIn / (1000 * 60 * 60)

      if (hoursSinceCheckIn > 16) {
        // Đã qua 16 giờ, có thể quên check-out
        status = WORK_STATUS.QUEN_CHECK_OUT
      } else {
        // Chưa qua 16 giờ, thiếu log
        status = WORK_STATUS.THIEU_LOG
      }
    } else if (goWorkLog && !checkInLog) {
      // Có go_work nhưng không có check-in
      status = WORK_STATUS.THIEU_LOG
    }

    // Tạo đối tượng trạng thái làm việc
    const workStatus = {
      date,
      status,
      shiftId: shift?.id,
      shiftName: shift?.name,
      checkInTime: checkInTime ? checkInTime.toISOString() : null,
      checkOutTime: checkOutTime ? checkOutTime.toISOString() : null,
      workMinutes,
      breakMinutes: shift?.breakMinutes || 0,
      otMinutes,
      lateMinutes,
      earlyMinutes,
      isManuallyUpdated: false,
      calculatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return workStatus
  } catch (error) {
    console.error(`Lỗi khi tính toán trạng thái làm việc cho ngày ${date}:`, error)

    // Trả về trạng thái mặc định nếu có lỗi
    return {
      date,
      status: WORK_STATUS.CHUA_CAP_NHAT,
      error: error.message,
      calculatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}

/**
 * Tính toán và lưu trạng thái làm việc cho một ngày
 * @param {string} date Ngày cần tính toán (định dạng YYYY-MM-DD)
 * @param {Object} shift Ca làm việc áp dụng
 * @returns {Promise<Object>} Trạng thái làm việc đã tính toán và lưu
 */
export const calculateAndSaveDailyWorkStatus = async (date, shift) => {
  try {
    // Lấy trạng thái hiện tại
    const currentStatus = await storage.getDailyWorkStatus(date)

    // Nếu trạng thái đã được cập nhật thủ công, không tính toán lại
    if (currentStatus && currentStatus.isManuallyUpdated) {
      return currentStatus
    }

    // Tính toán trạng thái mới
    const newStatus = await calculateDailyWorkStatus(date, shift)

    // Lưu trạng thái mới
    await storage.setDailyWorkStatus(date, newStatus)

    return newStatus
  } catch (error) {
    console.error(`Lỗi khi tính toán và lưu trạng thái làm việc cho ngày ${date}:`, error)
    return null
  }
}

/**
 * Cập nhật trạng thái làm việc thủ công
 * @param {string} date Ngày cần cập nhật (định dạng YYYY-MM-DD)
 * @param {string} status Trạng thái mới
 * @param {Object} additionalData Dữ liệu bổ sung (tùy chọn)
 * @returns {Promise<Object>} Trạng thái làm việc đã cập nhật
 */
export const updateWorkStatusManually = async (date, status, additionalData = {}) => {
  try {
    // Lấy trạng thái hiện tại
    const currentStatus = (await storage.getDailyWorkStatus(date)) || {}

    // Cập nhật trạng thái
    const updatedStatus = {
      ...currentStatus,
      ...additionalData,
      date,
      status,
      isManuallyUpdated: true,
      updatedAt: new Date().toISOString(),
    }

    // Lưu trạng thái mới
    await storage.setDailyWorkStatus(date, updatedStatus)

    return updatedStatus
  } catch (error) {
    console.error(`Lỗi khi cập nhật thủ công trạng thái làm việc cho ngày ${date}:`, error)
    return null
  }
}

/**
 * Tính toán trạng thái làm việc cho ngày hiện tại
 * @returns {Promise<Object>} Trạng thái làm việc đã tính toán và lưu
 */
export const calculateTodayWorkStatus = async () => {
  try {
    // Lấy ngày hiện tại
    const today = formatDate(new Date())

    // Lấy ca làm việc đang áp dụng
    const activeShift = await storage.getActiveShift()

    // Tính toán và lưu trạng thái
    return await calculateAndSaveDailyWorkStatus(today, activeShift)
  } catch (error) {
    console.error("Lỗi khi tính toán trạng thái làm việc cho ngày hiện tại:", error)
    return null
  }
}

/**
 * Tính toán trạng thái làm việc cho một khoảng thời gian
 * @param {Date} startDate Ngày bắt đầu
 * @param {Date} endDate Ngày kết thúc
 * @returns {Promise<Array>} Danh sách trạng thái làm việc đã tính toán
 */
export const calculateWorkStatusForDateRange = async (startDate, endDate) => {
  try {
    const results = []

    // Lấy ca làm việc đang áp dụng
    const activeShift = await storage.getActiveShift()

    // Tính toán cho từng ngày trong khoảng
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate)

      // Tính toán và lưu trạng thái
      const status = await calculateAndSaveDailyWorkStatus(dateStr, activeShift)
      results.push(status)

      // Chuyển sang ngày tiếp theo
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return results
  } catch (error) {
    console.error("Lỗi khi tính toán trạng thái làm việc cho khoảng thời gian:", error)
    return []
  }
}

export default {
  calculateDailyWorkStatus,
  calculateAndSaveDailyWorkStatus,
  updateWorkStatusManually,
  calculateTodayWorkStatus,
  calculateWorkStatusForDateRange,
}
