export const getPageAssistTextSplitter = async () => {
    return {
        splitDocuments: async (docs: any[]) => docs
    }
}
