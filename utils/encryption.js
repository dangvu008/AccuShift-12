import AsyncStorage from "@react-native-async-storage/async-storage"

// Khóa mã hóa cơ bản (trong thực tế, nên sử dụng cơ chế phức tạp hơn)
// Lưu ý: Đây chỉ là lớp bảo mật cơ bản, không phải bảo mật tuyệt đối
const ENCRYPTION_KEY = "AccShift_Secure_Key_2025"

/**
 * Mã hóa một chuỗi
 * @param {string} text Chuỗi cần mã hóa
 * @returns {string} Chuỗi đã mã hóa
 */
export const encrypt = (text) => {
  if (!text) return ""

  // Tạo một chuỗi mã hóa đơn giản bằng XOR với khóa
  let result = ""
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    result += String.fromCharCode(charCode)
  }

  // Chuyển đổi sang Base64 để lưu trữ an toàn
  return Buffer.from(result, "utf8").toString("base64")
}

/**
 * Giải mã một chuỗi
 * @param {string} encryptedText Chuỗi đã mã hóa
 * @returns {string} Chuỗi gốc
 */
export const decrypt = (encryptedText) => {
  if (!encryptedText) return ""

  try {
    // Giải mã Base64
    const base64Decoded = Buffer.from(encryptedText, "base64").toString("utf8")

    // Giải mã XOR
    let result = ""
    for (let i = 0; i < base64Decoded.length; i++) {
      const charCode = base64Decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      result += String.fromCharCode(charCode)
    }

    return result
  } catch (error) {
    console.error("Lỗi khi giải mã:", error)
    return ""
  }
}

/**
 * Mã hóa và lưu dữ liệu vào AsyncStorage
 * @param {string} key Khóa lưu trữ
 * @param {any} value Giá trị cần lưu
 */
export const secureStore = async (key, value) => {
  try {
    const valueToStore = typeof value === "string" ? value : JSON.stringify(value)
    const encryptedValue = encrypt(valueToStore)
    await AsyncStorage.setItem(`encrypted_${key}`, encryptedValue)
    return true
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu mã hóa:", error)
    return false
  }
}

/**
 * Lấy và giải mã dữ liệu từ AsyncStorage
 * @param {string} key Khóa lưu trữ
 * @returns {Promise<any>} Dữ liệu đã giải mã
 */
export const secureRetrieve = async (key) => {
  try {
    const encryptedValue = await AsyncStorage.getItem(`encrypted_${key}`)
    if (!encryptedValue) return null

    const decryptedValue = decrypt(encryptedValue)
    try {
      // Thử parse JSON
      return JSON.parse(decryptedValue)
    } catch {
      // Nếu không phải JSON, trả về chuỗi
      return decryptedValue
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu mã hóa:", error)
    return null
  }
}

/**
 * Xóa dữ liệu mã hóa từ AsyncStorage
 * @param {string} key Khóa lưu trữ
 */
export const secureRemove = async (key) => {
  try {
    await AsyncStorage.removeItem(`encrypted_${key}`)
    return true
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu mã hóa:", error)
    return false
  }
}

/**
 * Mã hóa một phần của chuỗi, giữ nguyên phần đầu và cuối
 * @param {string} text Chuỗi cần mã hóa một phần
 * @param {number} visibleChars Số ký tự hiển thị ở đầu và cuối
 * @returns {string} Chuỗi đã mã hóa một phần
 */
export const maskString = (text, visibleChars = 4) => {
  if (!text || text.length <= visibleChars * 2) return text

  const start = text.substring(0, visibleChars)
  const end = text.substring(text.length - visibleChars)
  const masked = "*".repeat(text.length - visibleChars * 2)

  return `${start}${masked}${end}`
}

/**
 * Tạo device fingerprint để tăng cường bảo mật
 * @returns {Promise<string>} Device fingerprint
 */
export const getDeviceFingerprint = async () => {
  try {
    // Trong thực tế, nên sử dụng thư viện như react-native-device-info
    // để lấy thông tin thiết bị một cách chi tiết hơn
    const deviceId = await AsyncStorage.getItem("device_id")
    if (deviceId) return deviceId

    // Tạo một ID ngẫu nhiên nếu chưa có
    const newDeviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    await AsyncStorage.setItem("device_id", newDeviceId)
    return newDeviceId
  } catch (error) {
    console.error("Lỗi khi lấy device fingerprint:", error)
    return "unknown_device"
  }
}

/**
 * Mã hóa nâng cao với device fingerprint
 * @param {string} text Chuỗi cần mã hóa
 * @returns {Promise<string>} Chuỗi đã mã hóa
 */
export const advancedEncrypt = async (text) => {
  if (!text) return ""

  // Lấy device fingerprint
  const deviceFingerprint = await getDeviceFingerprint()

  // Kết hợp khóa mã hóa với device fingerprint
  const combinedKey = ENCRYPTION_KEY + deviceFingerprint

  // Mã hóa với khóa kết hợp
  let result = ""
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ combinedKey.charCodeAt(i % combinedKey.length)
    result += String.fromCharCode(charCode)
  }

  // Chuyển đổi sang Base64
  return Buffer.from(result, "utf8").toString("base64")
}

/**
 * Giải mã nâng cao với device fingerprint
 * @param {string} encryptedText Chuỗi đã mã hóa
 * @returns {Promise<string>} Chuỗi gốc
 */
export const advancedDecrypt = async (encryptedText) => {
  if (!encryptedText) return ""

  try {
    // Lấy device fingerprint
    const deviceFingerprint = await getDeviceFingerprint()

    // Kết hợp khóa mã hóa với device fingerprint
    const combinedKey = ENCRYPTION_KEY + deviceFingerprint

    // Giải mã Base64
    const base64Decoded = Buffer.from(encryptedText, "base64").toString("utf8")

    // Giải mã XOR
    let result = ""
    for (let i = 0; i < base64Decoded.length; i++) {
      const charCode = base64Decoded.charCodeAt(i) ^ combinedKey.charCodeAt(i % combinedKey.length)
      result += String.fromCharCode(charCode)
    }

    return result
  } catch (error) {
    console.error("Lỗi khi giải mã nâng cao:", error)
    return ""
  }
}

/**
 * Lưu trữ bảo mật nâng cao
 * @param {string} key Khóa lưu trữ
 * @param {any} value Giá trị cần lưu
 */
export const advancedSecureStore = async (key, value) => {
  try {
    const valueToStore = typeof value === "string" ? value : JSON.stringify(value)
    const encryptedValue = await advancedEncrypt(valueToStore)
    await AsyncStorage.setItem(`secure_${key}`, encryptedValue)
    return true
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu mã hóa nâng cao:", error)
    return false
  }
}

/**
 * Lấy dữ liệu bảo mật nâng cao
 * @param {string} key Khóa lưu trữ
 * @returns {Promise<any>} Dữ liệu đã giải mã
 */
export const advancedSecureRetrieve = async (key) => {
  try {
    const encryptedValue = await AsyncStorage.getItem(`secure_${key}`)
    if (!encryptedValue) return null

    const decryptedValue = await advancedDecrypt(encryptedValue)
    try {
      // Thử parse JSON
      return JSON.parse(decryptedValue)
    } catch {
      // Nếu không phải JSON, trả về chuỗi
      return decryptedValue
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu mã hóa nâng cao:", error)
    return null
  }
}
