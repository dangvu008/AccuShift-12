# AccShift - Ứng dụng quản lý thời gian

AccShift là ứng dụng quản lý thời gian và chấm công di động được xây dựng bằng React Native và Expo.

## Cài đặt

1. Cài đặt các phụ thuộc:

\`\`\`bash
npm install
\`\`\`

2. Chạy ứng dụng:

\`\`\`bash
npm start
\`\`\`

## Cấu trúc dự án

\`\`\`
accshift/
├── assets/                # Hình ảnh, font chữ và tài nguyên tĩnh
├── components/            # Các thành phần UI có thể tái sử dụng
├── config/                # Cấu hình ứng dụng
├── context/               # Context API và quản lý trạng thái
├── hooks/                 # Custom hooks
├── screens/               # Các màn hình ứng dụng
├── services/              # Các dịch vụ (API, cơ sở dữ liệu)
├── utils/                 # Các tiện ích và hàm hỗ trợ
├── App.js                 # Điểm vào ứng dụng
├── app.json               # Cấu hình Expo
└── package.json           # Phụ thuộc và scripts
\`\`\`

## Hướng dẫn phát triển

### Quy tắc chung

1. **Mã sạch**: Tuân thủ các quy tắc ESLint và định dạng code.
2. **Tổ chức**: Giữ các file dưới 300 dòng, tách logic thành các module nhỏ.
3. **Bảo mật**: Sử dụng các tiện ích bảo mật trong `utils/security.js` cho dữ liệu nhạy cảm.
4. **Hiệu suất**: Tối ưu hóa render và tránh re-render không cần thiết.

### Thêm tính năng mới

1. Tạo branch mới từ `main`:
   \`\`\`bash
   git checkout -b feature/ten-tinh-nang
   \`\`\`

2. Phát triển tính năng và kiểm tra kỹ lưỡng.

3. Tạo Pull Request để merge vào `main`.

### Quy trình phát hành

1. Cập nhật phiên bản trong `app.json` và `package.json`.

2. Tạo bản build cho iOS và Android:
   \`\`\`bash
   expo build:ios
   expo build:android
   \`\`\`

3. Kiểm tra bản build trên thiết bị thật.

4. Phát hành lên App Store và Google Play.

## Bảo mật

### Lưu trữ dữ liệu nhạy cảm

Sử dụng các hàm trong `utils/security.js` để mã hóa và lưu trữ dữ liệu nhạy cảm:

\`\`\`javascript
import { secureStore, secureRetrieve } from '../utils/security';

// Lưu trữ
await secureStore('api_key', 'your-secret-key');

// Lấy dữ liệu
const apiKey = await secureRetrieve('api_key');
\`\`\`

### Bảo vệ API Keys

API keys được mã hóa và lưu trữ an toàn. Không bao giờ lưu trữ API keys dưới dạng văn bản thuần túy trong mã nguồn.

## Kiểm thử

Chạy kiểm thử:

\`\`\`bash
npm test
\`\`\`

## Tài liệu API

### Thời tiết

\`\`\`javascript
import { getCurrentWeather, getWeatherForecast } from '../services/weatherService';

// Lấy thời tiết hiện tại
const weather = await getCurrentWeather(latitude, longitude);

// Lấy dự báo thời tiết
const forecast = await getWeatherForecast(latitude, longitude);
\`\`\`

### Cơ sở dữ liệu

\`\`\`javascript
import { getShifts, addShift, updateShift, deleteShift } from '../utils/database';

// Lấy tất cả ca làm việc
const shifts = await getShifts();

// Thêm ca làm việc mới
const newShift = await addShift(shiftData);
\`\`\`

## Liên hệ

Nếu có câu hỏi hoặc gặp vấn đề, vui lòng liên hệ:

- Email: support@accshift.com
- Website: https://accshift.com
\`\`\`

## 9. Tạo file .gitignore để loại trừ các file không cần thiết

\`\`\`plaintext file=".gitignore"
# OSX
#
.DS_Store

# Xcode
#
build/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata
*.xccheckout
*.moved-aside
DerivedData
*.hmap
*.ipa
*.xcuserstate
project.xcworkspace

# Android/IntelliJ
#
build/
.idea
.gradle
local.properties
*.iml
*.hprof
.cxx/
*.keystore
!debug.keystore

# node.js
#
node_modules/
npm-debug.log
yarn-error.log

# Bundle artifacts
*.jsbundle

# CocoaPods
/ios/Pods/

# Expo
.expo/
web-build/
dist/

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Temporary files
*.swp
*.swo
.DS_Store
*.orig
*~

# Testing
coverage/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories and files
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# API keys and secrets
google-services.json
GoogleService-Info.plist
sentry.properties
# AccShift12
# AccuShift-12
