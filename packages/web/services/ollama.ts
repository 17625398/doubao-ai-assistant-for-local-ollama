export const getOllamaURL = async (): Promise<string> => {
    return "http://localhost:11434"
}

export const getSelectedModel = async (): Promise<string> => {
    return "llama2"
}

export const defaultEmbeddingModelForRag = async (): Promise<string | null> => {
    return null
}
