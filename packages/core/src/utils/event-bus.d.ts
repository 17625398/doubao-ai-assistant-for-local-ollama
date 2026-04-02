export type EventHandler<T = unknown> = (payload: T) => void;
export declare class EventBus {
    private static instance;
    private listeners;
    static getInstance(): EventBus;
    on<T>(event: string, handler: EventHandler<T>): () => void;
    off<T>(event: string, handler: EventHandler<T>): void;
    emit<T>(event: string, payload: T): void;
    once<T>(event: string, handler: EventHandler<T>): void;
    clear(event?: string): void;
}
export declare const eventBus: EventBus;
