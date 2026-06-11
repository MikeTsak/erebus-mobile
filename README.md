# Erebus Mobile Companion

A mobile companion app for the Vampire Platform, providing secure in-character communication (SchreckNet) and out-of-character email (Surface Web) for LARP participants.

## Features

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