# Wellness App 🧘‍♀️

A React Native wellness scheduling app that helps users fit mindful breaks into their busy day. Features mood-adaptive UI with breathing animations, intelligent calendar integration, and one-tap wellness event scheduling.

---

## ✨ Features

### 🗓️ Smart Calendar Integration
- **Automatic Free Slot Detection**: Scans your calendar to find 15-30 minute windows
- **Intelligent Time Bucketing**: Suggests up to 2 slots per time period (morning/afternoon/evening)
- **Conflict Prevention**: Real-time overlap detection with visual feedback
- **Custom Duration**: Choose 15 or 30-minute slots on the fly
- **Metadata Tracking**: Stores exercise type, mood, and slot ID for each wellness event
- **External Event Display**: Shows all calendar events with location and source info

### 🎨 Mood-Adaptive Interface
- **Three Mood Themes**: Calm (cool blues), Energetic (warm oranges), Stressed (alert reds)
- **Dynamic Breathing Animations**: Scale and shadow pulses match emotional pace
   - **Calm**: Slow, peaceful (2.4-3.0s cycles)
   - **Energetic**: Moderate, dynamic (1.35-1.8s cycles)
   - **Stressed**: Fast, urgent (0.75-1.05s cycles)
- **Smooth Gradient Transitions**: Background colors shift with mood changes
- **Time-of-Day Tinting**: Subtle environmental adjustments for morning/afternoon/evening

### 💪 Wellness Exercise Library
Each mood comes with curated exercises:
- **Calm**: Breathwork, Light Stretch, Calm Walk
- **Energetic**: HIIT Burst, Dance Break, Power Walk
- **Stressed**: Box Breathing, Slow Walk, Neck Release

### 🎯 User Experience
- **One-Tap Scheduling**: Select exercise + duration, tap Add
- **Visual Feedback**: Success/error banners, conflict warnings
- **Time Picker**: Custom time selection with native date picker
- **Pull-to-Refresh**: Quick calendar sync
- **App State Sync**: Auto-refresh when returning to app

---

## 🏗️ Architecture

### Project Structure
   ```

src/
├── screens/
│   └── HomeScreen.tsx           # Main screen: mood selector, busy list, suggestions
├── components/
│   ├── MoodScene.tsx            # Animated gradient background wrapper
│   ├── BusyList.tsx             # Today's events (app + external)
│   └── ScheduleSuggestions.tsx  # Free slot cards with exercise selection
├── services/
│   └── CalendarService.ts       # Calendar API: permissions, fetch, slots, CRUD
└── types/
    └── mood.ts                  # Mood theme definitions and configurations
```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: 20+
- **React Native CLI**: `npm install -g react-native-cli`
- **iOS Development**:
  - macOS with Xcode 26+
  - CocoaPods: `sudo gem install cocoapods`
- **Android Development**:
  - Android Studio
  - Java 17 (for build tools)

### Steps

1. **Clone and Install Dependencies**
   ```sh
   git clone <your-repo-url>
   cd Wellness
   yarn install  # or npm install
   ```

2. **iOS Setup**
   ```sh
   cd ios
   pod install
   cd ..
   ```

3. **Android Setup**
   - Open `android/` folder in Android Studio
   - Sync Gradle (automatic on first open)

4. **Start Metro Bundler**
   ```sh
   yarn start
   ```

5. **Run on Device/Emulator**
   ```sh
   # iOS
   yarn ios
   
   # Android
   yarn android
   ```

---

## 🔐 Permissions

### iOS (`ios/Wellness/Info.plist`)
```xml
<key>NSCalendarsUsageDescription</key>
<string>Wellness app needs calendar access to suggest free time slots and schedule mindful breaks.</string>
```

### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.READ_CALENDAR" />
<uses-permission android:name="android.permission.WRITE_CALENDAR" />
```

**Note**: Both platforms prompt user on first calendar access. The app handles denial gracefully with error messages.

---

## 📦 Building for Production

### Android APK
```sh
cd android
./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🎥 Demo Showcase

### Key User Flows to Demonstrate:
1. **Permission Flow**: First launch → calendar permission prompt
2. **Mood Selection**: Toggle between Calm/Stressed/Energetic (watch gradient shift)
3. **Free Slots**: View up to 2 suggested times for morning/afternoon/evening
4. **Duration Selection**: Switch between 15m and 30m (watch end time update)
5. **Exercise Selection**: Choose activity, tap "Add" → event appears in Busy list
6. **Conflict Handling**: Try adding overlapping event → red flash warning
7. **Time Adjustment**: Tap "Change time" → pick new start time
8. **Removal**: Tap "Remove" on wellness event → calendar updates
9. **External Events**: Show non-app events with location/calendar info
10. **Breathing Animations**: Compare animation speed across moods

---