

export const DEFAULT_MODEL_ID = 'gemini-3-flash-preview'; 

export const TAB_CYCLE_MODELS: string[] = [
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite-preview',
    'deepseek-v4',
];

export const GEMINI_3_RO_MODELS: string[] = [
    'gemini-3.1-pro-preview',
    'models/gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'models/gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'models/gemini-3.1-flash-lite-preview',
];

export const DEEPSEEK_MODELS: string[] = [
    'deepseek-v4',
    'deepseek-v4-pro',
    'deepseek-v4-flash',
    'deepseek-v3',
    'deepseek-coder',
];

export const MODELS_MANDATORY_THINKING = [
    'gemini-3.1-pro-preview',
    'models/gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'models/gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'models/gemini-3.1-flash-lite-preview',
];

export const MODELS_SUPPORTING_RAW_MODE = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-pro-preview',
];

export const DEFAULT_THINKING_LEVEL = 'HIGH';

export const THINKING_BUDGET_RANGES: { [key: string]: { min: number; max: number } } = {
    'gemini-3.1-pro-preview': { min: 128, max: 32768 },
    'models/gemini-3.1-pro-preview': { min: 128, max: 32768 },
    'gemini-3-flash-preview': { min: 128, max: 32768 },
    'models/gemini-3-flash-preview': { min: 128, max: 32768 },
    'gemini-3.1-flash-lite-preview': { min: 128, max: 32768 },
    'models/gemini-3.1-flash-lite-preview': { min: 128, max: 32768 },
    'gemini-2.5-flash-native-audio-preview-12-2025': { min: 0, max: 24576 },
    'deepseek-v4': { min: 128, max: 16384 },
    'deepseek-v4-pro': { min: 128, max: 32768 },
    'deepseek-v4-flash': { min: 64, max: 8192 },
    'deepseek-v3': { min: 0, max: 8192 },
    'deepseek-coder': { min: 0, max: 4096 },
};

export const DEFAULT_TEMPERATURE = 1.0;
export const DEFAULT_TOP_P = 0.95;
export const DEFAULT_TOP_K = 64; // Recommended by Gemma 4 model card
export const DEFAULT_SHOW_THOUGHTS = true;
export const DEFAULT_THINKING_BUDGET = -1; // -1 for auto/unlimited budget
export const DEFAULT_TTS_VOICE = 'Zephyr';

export const DEFAULT_TRANSCRIPTION_MODEL_ID = 'gemini-3-flash-preview';
export const DEFAULT_TTS_MODEL_ID = 'gemini-3.1-flash-tts-preview';
export const DEFAULT_AUTO_CANVAS_MODEL_ID = 'gemini-3-flash-preview';
