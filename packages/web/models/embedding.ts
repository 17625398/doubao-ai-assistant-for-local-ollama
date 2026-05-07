export const pageAssistEmbeddingModel = async (config: { model: string; baseUrl: string }) => {
    return {
        embedDocuments: async (texts: string[]) => texts.map(() => []),
        embedQuery: async (text: string) => []
    }
}
