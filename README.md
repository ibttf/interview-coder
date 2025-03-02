# Interview Coder

An invisible desktop application that will help you pass your technical interviews.

https://www.interviewcoder.co


https://github.com/user-attachments/assets/0615b110-2670-4b0e-bc69-3c32a2d8a996

## Invisibility Compatibility

The application is invisible to:

- Zoom versions below 6.1.6 (inclusive)
- All browser-based screen recording software
- All versions of Discord
- Mac OS _screenshot_ functionality (Command + Shift + 3/4)

Note: The application is **NOT** invisible to:

- Zoom versions 6.1.6 and above
  - https://zoom.en.uptodown.com/mac/versions (link to downgrade Zoom if needed)
- Mac OS native screen _recording_ (Command + Shift + 5)

## Features

- 🎯 99% Invisibility: Undetectable window that bypasses most screen capture methods
- 📸 Smart Screenshot Capture: Capture both question text and code separately for better analysis
- 🤖 AI-Powered Analysis: Automatically extracts and analyzes coding problems
- 💡 Solution Generation: Get detailed explanations and solutions
- 🔧 Real-time Debugging: Debug your code with AI assistance
- 🎨 Window Management: Freely move and position the window anywhere on screen

## Global Commands

The application uses unidentifiable global keyboard shortcuts that won't be detected by browsers or other applications:

- Toggle Window Visibility: [Control or Cmd + b]
- Move Window: [Control or Cmd + arrows]
- Take Screenshot: [Control or Cmd + H]
- Process Screenshots: [Control or Cmd + Enter]
- Reset View: [Control or Cmd + R]
- Quit: [Control or Cmd + Q]

## Usage

1. **Initial Setup**

   - Launch the invisible window
   - Login and subscribe

2. **Capturing Problem**

   - Use global shortcut [Control or Cmd + H] to take screenshots
   - Screenshots are automatically added to the queue of up to 5.

3. **Processing**

   - AI analyzes the screenshots to extract:
     - Problem requirements
     - Code context
   - System generates optimal solution strategy

4. **Solution & Debugging**

   - View generated solutions
   - Use debugging feature to:
     - Test different approaches
     - Fix errors in your code
     - Get line-by-line explanations
   - Toggle between solutions and queue views

5. **Window Management**
   - Move window freely using global shortcut
   - Toggle visibility as needed
   - Window remains invisible to specified applications
   - Reset view using Command + R

## Prerequisites

- Node.js (v16 or higher)
- npm or bun package manager
- Subscription on https://www.interviewcoder.co/settings
- Screen Recording Permission for Terminal/IDE
  - On macOS:
    1. Go to System Preferences > Security & Privacy > Privacy > Screen Recording
    2. Ensure that Interview Coder has screen recording permission enabled
    3. Restart Interview Coder after enabling permissions
  - On Windows:
    - No additional permissions needed
  - On Linux:
    - May require `xhost` access depending on your distribution

## Installation

1. Clone the repository:

```bash
git clone https://github.com/ibttf/interview-coder-v1.git
cd interview-coder-v1
```

2. Install dependencies:

```bash
npm install
# or if using bun
bun install
```

## Configure Environment Variables

- Before running the project, set up the required environment variables. You can do this by creating a .env file in the root directory of the project. Below is an example of the required environment variables:
```bash
VITE_SUPABASE_URL = "Your Supabase URL"
VITE_SUPABASE_ANON_KEY = "Your Supabase API Key"
```

## Running Locally

1. Start the development server:

```bash
npm run dev
```

This will:

- Start the Vite development server
- Launch the Electron application
- Enable hot-reloading for development

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI Components
- OpenAI API

## Configuration

1. On first launch, you'll need to provide your OpenAI API key
2. The application will store your settings locally using electron-store

## Building (for Roy)

after npm run build, hit:

```
node scripts/manual-notarize.js "release/Interview-Coder-x64.dmg" && xcrun stapler staple "release/Interview-Coder-x64.dmg"
node scripts/manual-notarize.js "release/Interview-Coder-arm64.dmg" && xcrun stapler staple "release/Interview-Coder-arm64.dmg"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
