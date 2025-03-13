// ProcessingHelper.ts
import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import axios from "axios"
import { app } from "electron"
import { BrowserWindow } from "electron"

const isDev = !app.isPackaged
const API_BASE_URL = isDev
  ? "http://localhost:3000"
  : "https://www.interviewcoder.co"

export class ProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()
  }

  private async waitForInitialization(
    mainWindow: BrowserWindow
  ): Promise<void> {
    let attempts = 0
    const maxAttempts = 50 // 5 seconds total

    while (attempts < maxAttempts) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(
        "window.__IS_INITIALIZED__"
      )
      if (isInitialized) return
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }
    throw new Error("App failed to initialize after 5 seconds")
  }

  private async getCredits(): Promise<number> {
    // Always return a high number of credits
    return 999
  }

  private async getLanguage(): Promise<string> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return "python"

    try {
      await this.waitForInitialization(mainWindow)
      const language = await mainWindow.webContents.executeJavaScript(
        "window.__LANGUAGE__"
      )

      if (
        typeof language !== "string" ||
        language === undefined ||
        language === null
      ) {
        console.warn("Language not properly initialized")
        return "python"
      }

      return language
    } catch (error) {
      console.error("Error getting language:", error)
      return "python"
    }
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    // Credits check is bypassed - we always have enough credits
    
    const view = this.deps.getView()
    console.log("Processing screenshots in view:", view)

    if (view === "queue") {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      console.log("Processing main queue screenshots:", screenshotQueue)
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      try {
        // Initialize AbortController
        this.currentProcessingAbortController = new AbortController()
        const { signal } = this.currentProcessingAbortController

        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64")
          }))
        )

        const result = await this.processScreenshotsHelper(screenshots, signal)

        if (!result.success) {
          console.log("Processing failed:", result.error)
          if (result.error?.includes("API Key out of credits")) {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.OUT_OF_CREDITS
            )
          } else if (result.error?.includes("OpenAI API key not found")) {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              "OpenAI API key not found in environment variables. Please set the OPEN_AI_API_KEY environment variable."
            )
          } else {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              result.error
            )
          }
          // Reset view back to queue on error
          console.log("Resetting view to queue due to error")
          this.deps.setView("queue")
          return
        }

        // Only set view to solutions if processing succeeded
        console.log("Setting view to solutions after successful processing")
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          result.data
        )
        this.deps.setView("solutions")
      } catch (error: any) {
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          error
        )
        console.error("Processing error:", error)
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "Server error. Please try again."
          )
        }
        // Reset view back to queue on error
        console.log("Resetting view to queue due to error")
        this.deps.setView("queue")
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
      console.log("Processing extra queue screenshots:", extraScreenshotQueue)
      if (extraScreenshotQueue.length === 0) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()
      const { signal } = this.currentExtraProcessingAbortController

      try {
        const screenshots = await Promise.all(
          [
            ...this.screenshotHelper.getScreenshotQueue(),
            ...extraScreenshotQueue
          ].map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64")
          }))
        )
        console.log(
          "Combined screenshots for processing:",
          screenshots.map((s) => s.path)
        )

        const result = await this.processExtraScreenshotsHelper(
          screenshots,
          signal
        )

        if (result.success) {
          this.deps.setHasDebugged(true)
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            "Extra processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private async processScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    const MAX_RETRIES = 0
    let retryCount = 0

    while (retryCount <= MAX_RETRIES) {
      try {
        const imageDataList = screenshots.map((screenshot) => screenshot.data)
        const mainWindow = this.deps.getMainWindow()
        const language = await this.getLanguage()
        let problemInfo

        // First API call - extract problem info
        try {
          const extractResponse = await axios.post(
            `${API_BASE_URL}/api/extract`,
            { imageDataList, language },
            {
              signal,
              timeout: 300000,
              validateStatus: function (status) {
                return status < 500
              },
              maxRedirects: 5,
              headers: {
                "Content-Type": "application/json"
              }
            }
          )

          problemInfo = extractResponse.data

          // Store problem info in AppState
          this.deps.setProblemInfo(problemInfo)

          // Send first success event
          if (mainWindow) {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
              problemInfo
            )

            // Generate solutions after successful extraction
            console.log("Starting solution generation")
            const solutionsResult = await this.generateSolutionsHelper(signal)
            if (solutionsResult.success) {
              console.log("Solution generation successful", solutionsResult.data)
              
              // Use the solution data directly without replacing newlines
              const formattedData = solutionsResult.data;
              
              // Clear any existing extra screenshots before transitioning to solutions view
              this.screenshotHelper.clearExtraScreenshotQueue()
              mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
              formattedData
              )
              return { success: true, data: solutionsResult.data }
            } else {
              console.error("Solution generation failed", solutionsResult.error)
              throw new Error(
              solutionsResult.error || "Failed to generate solutions"
              )
            }
          }
        } catch (error: any) {
          // If the request was cancelled, don't retry
          if (axios.isCancel(error)) {
            return {
              success: false,
              error: "Processing was canceled by the user."
            }
          }

          console.error("API Error Details:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            code: error.code
          })

          // Handle API-specific errors
          if (
            error.response?.data?.error &&
            typeof error.response.data.error === "string"
          ) {
            if (error.response.data.error.includes("Operation timed out")) {
              throw new Error(
                "Operation timed out after 1 minute. Please try again."
              )
            }
            if (error.response.data.error.includes("API Key out of credits")) {
              throw new Error(error.response.data.error)
            }
            throw new Error(error.response.data.error)
          }

          // If we get here, it's an unknown error
          throw new Error(error.message || "Server error. Please try again.")
        }
      } catch (error: any) {
        // Log the full error for debugging
        console.error("Processing error details:", {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          retryCount
        })

        // If it's a cancellation or we've exhausted retries, return the error
        if (axios.isCancel(error) || retryCount >= MAX_RETRIES) {
          return { success: false, error: error.message }
        }

        // Increment retry count and continue
        retryCount++
      }
    }

    // If we get here, all retries failed
    return {
      success: false,
      error: "Failed to process after multiple attempts. Please try again."
    }
  }

  private async generateSolutionsHelper(signal: AbortSignal) {
    try {
      const problemInfo = this.deps.getProblemInfo()
      const language = await this.getLanguage()

      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/generate`,
        { ...problemInfo, language },
        {
          signal,
          timeout: 300000,
          validateStatus: function (status) {
            return status < 500
          },
          maxRedirects: 5,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )

      console.log("Response received:", response)

      return { success: true, data: response.data }
    } catch (error: any) {
      const mainWindow = this.deps.getMainWindow()

      // Handle timeout errors (both 504 and axios timeout)
      if (error.code === "ECONNABORTED" || error.response?.status === 504) {
        // Cancel ongoing API requests
        this.cancelOngoingRequests()
        // Clear both screenshot queues
        this.deps.clearQueues()
        // Update view state to queue
        this.deps.setView("queue")
        // Notify renderer to switch view
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Request timed out. The server took too long to respond. Please try again."
          )
        }
        return {
          success: false,
          error: "Request timed out. Please try again."
        }
      }

      if (error.response?.data?.error?.includes("API Key out of credits")) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.OUT_OF_CREDITS
          )
        }
        return { success: false, error: error.response.data.error }
      }

      if (
        error.response?.data?.error?.includes(
          "Please close this window and re-enter a valid Open AI API key."
        )
      ) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.API_KEY_INVALID
          )
        }
        return { success: false, error: error.response.data.error }
      }

      return { success: false, error: error.message }
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const imageDataList = screenshots.map((screenshot) => screenshot.data)
      const problemInfo = this.deps.getProblemInfo()
      const language = await this.getLanguage()

      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/debug`,
        { imageDataList, problemInfo, language },
        {
          signal,
          timeout: 300000,
          validateStatus: function (status) {
            return status < 500
          },
          maxRedirects: 5,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )

      return { success: true, data: response.data }
    } catch (error: any) {
      const mainWindow = this.deps.getMainWindow()

      // Handle cancellation first
      if (axios.isCancel(error)) {
        return {
          success: false,
          error: "Processing was canceled by the user."
        }
      }

      if (error.response?.data?.error?.includes("Operation timed out")) {
        // Cancel ongoing API requests
        this.cancelOngoingRequests()
        // Clear both screenshot queues
        this.deps.clearQueues()
        // Update view state to queue
        this.deps.setView("queue")
        // Notify renderer to switch view
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            "Operation timed out after 1 minute. Please try again."
          )
        }
        return {
          success: false,
          error: "Operation timed out after 1 minute. Please try again."
        }
      }

      if (error.response?.data?.error?.includes("API Key out of credits")) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.OUT_OF_CREDITS
          )
        }
        return { success: false, error: error.response.data.error }
      }

      if (
        error.response?.data?.error?.includes(
          "Please close this window and re-enter a valid Open AI API key."
        )
      ) {
        if (mainWindow) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.API_KEY_INVALID
          )
        }
        return { success: false, error: error.response.data.error }
      }

      return { success: false, error: error.message }
    }
  }

  public cancelOngoingRequests(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      wasCancelled = true
    }

    // Reset hasDebugged flag
    this.deps.setHasDebugged(false)

    // Clear any pending state
    this.deps.setProblemInfo(null)

    const mainWindow = this.deps.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      // Send a clear message that processing was cancelled
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
    }
  }

  public cancelProcessing(): void {
    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort();
      this.currentProcessingAbortController = null;
    }
    
    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort();
      this.currentExtraProcessingAbortController = null;
    }
  }
}
