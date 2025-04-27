import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"
import { SECURITY_CONFIG, STORAGE_KEYS } from "../config/appConfig"

/**
 * Tạo một chuỗi ngẫu nhiên với độ dài xác định
 * @param {number} length Độ dài chuỗi
 * @returns {string} Chuỗi ngẫu nhiên
 */
export const generateRandomString = async (length = 16) => {
  const randomBytes = await Crypto.getRandomBytesAsync(length)
  return Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, length)
}

/**
 * Mã hóa một chuỗi sử dụng thuật toán AES
 * @param {string} text Chuỗi cần mã hóa
 * @returns {Promise<string>} Chuỗi đã mã hóa
 */
export const encrypt = async (text) => {
  if (!text) return ""

  try {
    // Tạo một vector khởi tạo (IV) ngẫu nhiên
    const iv = await generateRandomString(16)

    // Tạo khóa mã hóa từ khóa cấu hình
    const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, SECURITY_CONFIG.ENCRYPTION_KEY)

    // Mã hóa dữ liệu
    const data = new TextEncoder().encode(text)
    const algorithm = { name: "AES-GCM", iv: new TextEncoder().encode(iv) }

    // Sử dụng SubtleCrypto API nếu có sẵn
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(key.substring(0, 32)),
        algorithm,
        false,
        ["encrypt"],
      )

      const encryptedData = await crypto.subtle.encrypt(algorithm, cryptoKey, data)

      // Chuyển đổi sang Base64
      const encryptedArray = Array.from(new Uint8Array(encryptedData))
      const encryptedBase64 = btoa(String.fromCharCode.apply(null, encryptedArray))

      // Kết hợp IV và dữ liệu mã hóa
      return `${iv}:${encryptedBase64}`
    } else {
      // Fallback cho môi trường không hỗ trợ SubtleCrypto
      // Sử dụng phương pháp XOR đơn giản
      let result = ""
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        result += String.fromCharCode(charCode)
      }

      // Chuyển đổi sang Base64
      return `${iv}:${btoa(result)}`
    }
  } catch (error) {
    console.error("Lỗi khi mã hóa:", error)

    // Fallback đơn giản nếu có lỗi
    let result = ""
    for (let i = 0; i < text.length; i++) {
      const charCode =
        text.charCodeAt(i) ^ SECURITY_CONFIG.ENCRYPTION_KEY.charCodeAt(i % SECURITY_CONFIG.ENCRYPTION_KEY.length)
      result += String.fromCharCode(charCode)
    }

    return btoa(result)
  }
}

/**
 * Giải mã một chuỗi đã mã hóa
 * @param {string} encryptedText Chuỗi đã mã hóa
 * @returns {Promise<string>} Chuỗi gốc
 */
export const decrypt = async (encryptedText) => {
  if (!encryptedText) return ""

  try {
    // Tách IV và dữ liệu mã hóa
    const [iv, encryptedData] = encryptedText.split(":")

    if (!iv || !encryptedData) {
      // Định dạng không đúng, sử dụng phương pháp cũ
      const base64Decoded = atob(encryptedText)
      let result = ""
      for (let i = 0; i < base64Decoded.length; i++) {
        const charCode =
          base64Decoded.charCodeAt(i) ^
          SECURITY_CONFIG.ENCRYPTION_KEY.charCodeAt(i % SECURITY_CONFIG.ENCRYPTION_KEY.length)
        result += String.fromCharCode(charCode)
      }
      return result
    }

    // Tạo khóa giải mã từ khóa cấu hình
    const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, SECURITY_CONFIG.ENCRYPTION_KEY)

    // Giải mã dữ liệu
    const algorithm = { name: "AES-GCM", iv: new TextEncoder().encode(iv) }

    // Sử dụng SubtleCrypto API nếu có sẵn
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(key.substring(0, 32)),
        algorithm,
        false,
        ["decrypt"],
      )

      // Chuyển đổi từ Base64 sang ArrayBuffer
      const encryptedBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

      const decryptedData = await crypto.subtle.decrypt(algorithm, cryptoKey, encryptedBytes)

      return new TextDecoder().decode(decryptedData)
    } else {
      // Fallback cho môi trường không hỗ trợ SubtleCrypto
      const base64Decoded = atob(encryptedData)
      let result = ""
      for (let i = 0; i < base64Decoded.length; i++) {
        const charCode = base64Decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        result += String.fromCharCode(charCode)
      }
      return result
    }
  } catch (error) {
    console.error("Lỗi khi giải mã:", error)

    // Fallback đơn giản nếu có lỗi
    try {
      const base64Decoded = atob(encryptedText)
      let result = ""
      for (let i = 0; i < base64Decoded.length; i++) {
        const charCode =
          base64Decoded.charCodeAt(i) ^
          SECURITY_CONFIG.ENCRYPTION_KEY.charCodeAt(i % SECURITY_CONFIG.ENCRYPTION_KEY.length)
        result += String.fromCharCode(charCode)
      }
      return result
    } catch (e) {
      console.error("Lỗi khi giải mã fallback:", e)
      return ""
    }
  }
}

/**
 * Lưu trữ bảo mật sử dụng SecureStore nếu có thể, nếu không thì sử dụng AsyncStorage với mã hóa
 * @param {string} key Khóa lưu trữ
 * @param {any} value Giá trị cần lưu
 * @returns {Promise<boolean>} Kết quả lưu trữ
 */
export const secureStore = async (key, value) => {
  try {
    const valueToStore = typeof value === "string" ? value : JSON.stringify(value)

    // Sử dụng SecureStore nếu có thể (iOS và Android)
    if (Platform.OS !== "web" && SecureStore) {
      await SecureStore.setItemAsync(key, valueToStore)
      return true
    }

    // Fallback: Mã hóa và lưu vào AsyncStorage
    const encryptedValue = await encrypt(valueToStore)
    await AsyncStorage.setItem(`${SECURITY_CONFIG.SECURE_PREFIX}${key}`, encryptedValue)
    return true
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu bảo mật:", error)
    return false
  }
}

/**
 * Lấy dữ liệu bảo mật từ SecureStore hoặc AsyncStorage
 * @param {string} key Khóa lưu trữ
 * @returns {Promise<any>} Dữ liệu đã giải mã
 */
export const secureRetrieve = async (key) => {
  try {
    let value = null

    // Thử lấy từ SecureStore trước
    if (Platform.OS !== "web" && SecureStore) {
      value = await SecureStore.getItemAsync(key)
    }

    // Nếu không có trong SecureStore, thử lấy từ AsyncStorage
    if (!value) {
      const encryptedValue = await AsyncStorage.getItem(`${SECURITY_CONFIG.SECURE_PREFIX}${key}`)
      if (!encryptedValue) return null

      value = await decrypt(encryptedValue)
    }

    // Parse JSON nếu có thể
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu bảo mật:", error)
    return null
  }
}

/**
 * Xóa dữ liệu bảo mật
 * @param {string} key Khóa lưu trữ
 * @returns {Promise<boolean>} Kết quả xóa
 */
export const secureRemove = async (key) => {
  try {
    // Xóa từ cả SecureStore và AsyncStorage
    if (Platform.OS !== "web" && SecureStore) {
      await SecureStore.deleteItemAsync(key)
    }

    await AsyncStorage.removeItem(`${SECURITY_CONFIG.SECURE_PREFIX}${key}`)
    return true
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu bảo mật:", error)
    return false
  }
}

/**
 * Mã hóa một phần của chuỗi, giữ nguyên phần đầu và cuối
 * @param {string} text Chuỗi cần mã hóa một phần
 * @param {number} visibleChars Số ký tự hiển thị ở đầu và cuối
 * @returns {string} Chuỗi đã mã hóa một phần
 */
export const maskString = (text, visibleChars = SECURITY_CONFIG.MASK_VISIBLE_CHARS) => {
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
    // Thử lấy device ID đã lưu
    let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID)

    if (!deviceId) {
      // Tạo một ID ngẫu nhiên nếu chưa có
      deviceId = await generateRandomString(32)
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId)
    }

    return deviceId
  } catch (error) {
    console.error("Lỗi khi lấy device fingerprint:", error)

    // Fallback nếu có lỗi
    return "unknown_device"
  }
}

/**
 * Kiểm tra xem thiết bị có bị root/jailbreak không
 * @returns {Promise<boolean>} true nếu thiết bị bị root/jailbreak
 */
export const isDeviceRooted = async () => {
  // Trong thực tế, cần sử dụng thư viện như react-native-device-info
  // để kiểm tra thiết bị có bị root/jailbreak không
  return false
}

/**
 * Kiểm tra tính toàn vẹn của ứng dụng
 * @returns {Promise<boolean>} true nếu ứng dụng không bị sửa đổi
 */
export const verifyAppIntegrity = async () => {
  // Trong thực tế, cần sử dụng các API như Play Integrity API (Android)
  // hoặc App Attest API (iOS) để kiểm tra tính toàn vẹn của ứng dụng
  return true
}

/**
 * Kiểm tra bảo mật và cảnh báo nếu phát hiện vấn đề
 * @returns {Promise<{secure: boolean, warnings: string[]}>} Kết quả kiểm tra bảo mật
 */
export const performSecurityCheck = async () => {
  const warnings = []

  // Kiểm tra thiết bị có bị root/jailbreak không
  if (await isDeviceRooted()) {
    warnings.push("Thiết bị đã bị root/jailbreak, dữ liệu có thể không an toàn.")
  }

  // Kiểm tra tính toàn vẹn của ứng dụng
  if (!(await verifyAppIntegrity())) {
    warnings.push("Ứng dụng có thể đã bị sửa đổi.")
  }

  return {
    secure: warnings.length === 0,
    warnings,
  }
}

export default {
  encrypt,
  decrypt,
  secureStore,
  secureRetrieve,
  secureRemove,
  maskString,
  getDeviceFingerprint,
  isDeviceRooted,
  verifyAppIntegrity,
  performSecurityCheck,
  generateRandomString,
}
