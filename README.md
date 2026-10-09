<div align="center">
  <img src="https://img.shields.io/badge/Erebus%20Mobile-App-black?style=for-the-badge&logo=expo" alt="Erebus Mobile" />
  <h1>📱 Erebus Mobile Companion 📱</h1>
  <p><strong>Current Version: 1.0.0</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
    <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
  </p>
</div>

## 📖 Overview

The official mobile companion app for the Vampire Platform. 

It provides secure in-character communication via the **SchreckNet** protocol and out-of-character email via the **Surface Web** for LARP participants.

## ✨ Latest Features
- **Expo Router Architecture**: File-based routing using the latest `expo-router` for deep linking and native-like navigation.
- **React Native 0.81**: Bleeding-edge React Native engine with React 19 support.
- **Rich Media & Notifications**: Deep integration with `expo-image`, `expo-notifications`, and `expo-image-picker`.
- **Haptic Feedback**: Enhanced user experience with `expo-haptics` for physical responses during interactions.
- **Async Storage**: Persistent authentication and caching for offline capabilities.
- **Reanimated & Gesture Handler**: Buttery smooth 60fps animations and intuitive gestures.

## ⚙️ Core Features

- **SchreckNet**: Encrypted chat system for in-character Kindred communication.
- **Surface Web**: Email system for communicating with mortal contacts, NPCs, and out-of-character logistics.
- **Cross-platform**: Available for iOS, Android, and web via Expo.
- **Real-time notifications**: Receive alerts for new messages and game events.
- **Character integration**: Likely tied to your Vampire Platform character (to be confirmed from actual implementation).

## Getting Started

### Prerequisites

- Node.js 18+ (npm 9+ recommended)
- Expo CLI (or use `npx expo`)
- A running Vampire Platform backend (for authentication and message sync)

### Installation

1. Clone the repository and navigate to the erebus-mobile directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the app:
   - Create an `.env` file based on the example (if any) or set necessary environment variables for the Expo app (e.g., API URL).
   - Refer to the source code for any required configuration.
4. Start the development server:
   ```bash
   npx expo start
   ```
5. Use the Expo Go app on your device or run on an emulator/simulator.

## Technology Stack

- React Native
- Expo SDK
- React Navigation
- Axios for HTTP requests
- AsyncStorage for local data persistence

## Communication Systems

### SchreckNet
A secure, encrypted chat channel designed for in-character communication between Kindred. Messages are stored locally and synced with the server when online.

### Surface Web
An email-like system for communicating with mortal assets, contacts, and out-of-character game logistics. Mimics a classic email interface.

## Project Structure

- `app/`: Contains the main application screens and routing (Expo router).
- `components/`: Reusable components like ChatSystem and EmailSystem.
- `assets/`: Images, icons, and other static assets.
- `scripts/`: Utility scripts (e.g., reset-project).

## Notes

This app is part of the Vampire Platform ecosystem. It requires a working backend to authenticate users and synchronize messages. Ensure the backend is running and properly configured for CORS and authentication.

## License

Please check the LICENSE file in the repository for licensing information.