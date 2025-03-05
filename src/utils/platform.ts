// Get the platform safely
const getPlatform = () => {
  try {
    return window.electronAPI?.getPlatform() || 'win32' // Default to win32 if API is not available
  } catch {
    return 'win32' // Default to win32 if there's an error
  }
}

// Platform-specific command key symbol
export const COMMAND_KEY = getPlatform() === 'darwin' ? '⌘ + Shift' : 'Ctrl + Shift'

// Helper to check if we're on Windows
export const isWindows = getPlatform() === 'win32'

// Helper to check if we're on macOS
export const isMacOS = getPlatform() === 'darwin' 