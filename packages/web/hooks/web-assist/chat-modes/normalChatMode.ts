import { cleanUrl } from "~/libs/clean-url"
import {
  getOllamaURL,
  systemPromptForNonRagOption
} from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { generateID, getPromptById } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent
} from "@/libs/reasoning"
import { runMcpNormalChatMode } from "@/libs/mcp/normal-chat"
import { McpBootstrapError } from "@/libs/mcp/errors"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { systemPromptFormatter } from "@/utils/system-message"
import { normalizeImageToDataUrl, normalizeImagesToDataUrls } from "@/utils/to-source"

type ImageNormalizationOptions = {
  maxImages?: number
  maxImageBytes?: number
  maxTotalBytes?: number
}

export const normalChatMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  {
    selectedModel,
    useOCR,
    selectedSystemPrompt,
    currentChatModelSettings,
    setMessages,
    saveMessageOnSuccess,
    saveMessageOnError,
    setHistory,
    setIsProcessing,
    setStreaming,
    setAbortController,
    historyId,
    setHistoryId,
    uploadedFiles,
    images,
    setActionInfo,
    temporaryChat,
    requireMcpApproval,
    messageSource,
    messageType,
    systemPromptOverride,
    imageNormalizationOptions
  }: {
    selectedModel: string
    useOCR: boolean
    selectedSystemPrompt: string
    currentChatModelSettings: any
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
    saveMessageOnSuccess: (data: any) => Promise<string | null>
    saveMessageOnError: (data: any) => Promise<string | null>
    setHistory: (history: ChatHistory) => void
    setIsProcessing: (value: boolean) => void
    setStreaming: (value: boolean) => void
    setAbortController: (controller: AbortController | null) => void
    historyId: string | null
    setHistoryId: (id: string) => void
    uploadedFiles?: any[]
    images?: string[]
    setActionInfo?: (value: any) => void
    temporaryChat?: boolean
    requireMcpApproval?: boolean
    messageSource?: "copilot" | "web-ui"
    messageType?: string
    systemPromptOverride?: string
    imageNormalizationOptions?: ImageNormalizationOptions
  }
) => {
  console.log("Using normalChatMode")
  setStreaming(true)
  try {
    const handledByMcp = await runMcpNormalChatMode(
      message,
      image,
      isRegenerate,
      messages,
      history,
      signal,
      {
        selectedModel,
        useOCR,
        selectedSystemPrompt,
        currentChatModelSettings,
        setMessages,
        setHistory,
        setIsProcessing,
        setStreaming,
        setActionInfo: setActionInfo || (() => {}),
        historyId,
        setHistoryId,
        uploadedFiles,
        images,
        temporaryChat,
        requireMcpApproval,
        messageSource,
        messageType,
        systemPromptOverride,
        imageNormalizationOptions
      }
    )

    if (handledByMcp) {
      return
    }
  } catch (error) {
    if (error instanceof McpBootstrapError) {
      const processedImages = await normalizeImagesToDataUrls(
        images || [],
        imageNormalizationOptions
      )
      const imagesToSave =
        processedImages.length > 0 ? processedImages : image ? [image] : []

      const errorSave = await saveMessageOnError({
        e: error,
        botMessage: "",
        history,
        historyId,
        image: imagesToSave.length > 0 ? imagesToSave[0] : "",
        images: imagesToSave,
        selectedModel,
        setHistory,
        setHistoryId,
        userMessage: message,
        isRegenerating: isRegenerate,
        message_source: messageSource
      })

      if (!errorSave) {
        throw error
      }

      setIsProcessing(false)
      setStreaming(false)
      return
    }

    throw error
  }
  const url = await getOllamaURL()
  let promptId: string | undefined = systemPromptOverride ? undefined : selectedSystemPrompt
  let promptContent: string | undefined = undefined

  const processedImages = await normalizeImagesToDataUrls(
    images || [],
    imageNormalizationOptions
  )
  image = await normalizeImageToDataUrl(image)

  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  let newMessage: Message[] = []
  let generateMessageId = generateID()
  const modelInfo = await getModelNicknameByID(selectedModel)

  if (!isRegenerate) {
    // Use images array if available, otherwise fall back to single image
    const userImages = processedImages.length > 0 ? processedImages : (image ? [image] : [])

    newMessage = [
      ...messages,
      {
        isBot: false,
        name: "You",
        message,
        sources: [],
        images: userImages,
        messageType,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel,
        documents: uploadedFiles?.map(f => ({
          type: "file",
          filename: f.filename,
          fileSize: f.size,
          processed: f.processed
        })) || []
      },
      {
        isBot: true,
        name: selectedModel,
        message: "▋",
        sources: [],
        id: generateMessageId,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel
      }
    ]
  } else {
    newMessage = [
      ...messages,
      {
        isBot: true,
        name: selectedModel,
        message: "▋",
        sources: [],
        id: generateMessageId,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel
      }
    ]
  }
  setMessages(newMessage)
  let fullText = ""
  let contentToSave = ""
  let timetaken = 0

  try {
    const prompt = await systemPromptForNonRagOption()
    const selectedPrompt = await getPromptById(selectedSystemPrompt)
    const trimmedPromptOverride = systemPromptOverride?.trim()

    // Build content array with text and multiple images
    const contentArray: any[] = [
      {
        text: message,
        type: "text"
      }
    ]

    // Add all images to content array (use processedImages if available, otherwise single image)
    const imagesToUse = processedImages.length > 0 ? processedImages : (image.length > 0 ? [image] : [])

    imagesToUse.forEach((img) => {
      contentArray.push({
        image_url: img,
        type: "image_url"
      })
    })

    let humanMessage = await humanMessageFormatter({
      content: contentArray,
      model: selectedModel,
      useOCR: useOCR
    })

    const applicationChatHistory = generateHistory(history, selectedModel)

    if (trimmedPromptOverride) {
      applicationChatHistory.unshift(
        await systemPromptFormatter({
          content: trimmedPromptOverride
        })
      )
      promptContent = trimmedPromptOverride
    } else if (prompt && !selectedPrompt) {
      applicationChatHistory.unshift(
        await systemPromptFormatter({
          content: prompt
        })
      )
    }

    const isTempSystemprompt =
      currentChatModelSettings.systemPrompt &&
      currentChatModelSettings.systemPrompt?.trim().length > 0

    if (!trimmedPromptOverride && !isTempSystemprompt && selectedPrompt) {
      applicationChatHistory.unshift(
        await systemPromptFormatter({
          content: selectedPrompt.content
        })
      )
      promptContent = selectedPrompt.content
    }

    if (!trimmedPromptOverride && isTempSystemprompt) {
      applicationChatHistory.unshift(
        await systemPromptFormatter({
          content: currentChatModelSettings.systemPrompt
        })
      )
      promptContent = currentChatModelSettings.systemPrompt
    }

    let generationInfo: any | undefined = undefined

    const chunks = await ollama.stream(
      [...applicationChatHistory, humanMessage],
      {
        signal: signal,
        callbacks: [
          {
            handleLLMEnd(output: any): any {
              try {
                generationInfo = output?.generations?.[0][0]?.generationInfo
              } catch (e) {
                console.error("handleLLMEnd error", e)
              }
            }
          }
        ]
      }
    )

    let count = 0
    let reasoningStartTime: Date | null = null
    let reasoningEndTime: Date | null = null
    let apiReasoning: boolean = false

    for await (const chunk of chunks) {
      if (chunk?.additional_kwargs?.reasoning_content) {
        const reasoningContent = mergeReasoningContent(
          fullText,
          chunk?.additional_kwargs?.reasoning_content || ""
        )
        contentToSave = reasoningContent
        fullText = reasoningContent
        apiReasoning = true
      }

      if (apiReasoning && chunk?.content) {
        fullText += "</think>"
        contentToSave += "</think>"
        apiReasoning = false
      }

      contentToSave += chunk?.content
      fullText += chunk?.content

      if (isReasoningStarted(fullText) && !reasoningStartTime) {
        reasoningStartTime = new Date()
      }

      if (
        reasoningStartTime &&
        !reasoningEndTime &&
        isReasoningEnded(fullText)
      ) {
        reasoningEndTime = new Date()
        const reasoningTime =
          reasoningEndTime.getTime() - reasoningStartTime.getTime()
        timetaken = reasoningTime
      }

      if (count === 0) {
        setIsProcessing(true)
      }
      setMessages((prev) => {
        return prev.map((message) => {
          if (message.id === generateMessageId) {
            return {
              ...message,
              message: fullText + "▋",
              reasoning_time_taken: timetaken
            }
          }
          return message
        })
      })
      count++
    }

    setMessages((prev) => {
      return prev.map((message) => {
        if (message.id === generateMessageId) {
          return {
            ...message,
            message: fullText,
            generationInfo,
            reasoning_time_taken: timetaken
          }
        }
        return message
      })
    })

    const imagesToSave = processedImages.length > 0 ? processedImages : (image ? [image] : [])

    setHistory([
      ...history,
      {
        role: "user",
        content: message,
        image: imagesToSave.length > 0 ? imagesToSave[0] : undefined,
        images: imagesToSave.length > 0 ? imagesToSave : undefined,
        messageType
      },
      {
        role: "assistant",
        content: fullText,
        messageType
      }
    ])

    await saveMessageOnSuccess({
      historyId,
      setHistoryId,
      isRegenerate,
      selectedModel: selectedModel,
      message,
      image: imagesToSave.length > 0 ? imagesToSave[0] : "",
      images: imagesToSave,
      fullText,
      source: [],
      generationInfo,
      prompt_content: promptContent,
      prompt_id: promptId,
      reasoning_time_taken: timetaken,
      message_type: messageType
    })

    setIsProcessing(false)
    setStreaming(false)
  } catch (e) {

    console.log(e)

    const imagesToSave = processedImages.length > 0 ? processedImages : (image ? [image] : [])

    const errorSave = await saveMessageOnError({
      e,
      botMessage: fullText,
      history,
      historyId,
      image: imagesToSave.length > 0 ? imagesToSave[0] : "",
      images: imagesToSave,
      selectedModel,
      setHistory,
      setHistoryId,
      userMessage: message,
      isRegenerating: isRegenerate,
      prompt_content: promptContent,
      prompt_id: promptId,
      message_type: messageType
    })

    if (!errorSave) {
      throw e // Re-throw to be handled by the calling function
    }
    setIsProcessing(false)
    setStreaming(false)
  } finally {
    setAbortController(null)
  }
}
