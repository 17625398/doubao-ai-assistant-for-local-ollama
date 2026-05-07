import { EventBus } from '../utils/event-bus';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'rectangle' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  zIndex: number;
}

export interface CanvasState {
  elements: CanvasElement[];
  width: number;
  height: number;
  background: string;
}

export class ChatClawCanvasService {
  private canvasState: CanvasState = {
    elements: [],
    width: 800,
    height: 600,
    background: '#ffffff'
  };
  private eventBus: EventBus = new EventBus();
  private nextElementId: number = 1;

  getState(): CanvasState {
    return { ...this.canvasState };
  }

  setState(state: Partial<CanvasState>): void {
    this.canvasState = { ...this.canvasState, ...state };
    this.eventBus.emit('canvas:stateChanged', this.canvasState);
  }

  addElement(element: Omit<CanvasElement, 'id' | 'zIndex'>): CanvasElement {
    const newElement: CanvasElement = {
      ...element,
      id: `element_${this.nextElementId++}`,
      zIndex: this.canvasState.elements.length
    };
    this.canvasState.elements.push(newElement);
    this.eventBus.emit('canvas:elementAdded', newElement);
    this.eventBus.emit('canvas:stateChanged', this.canvasState);
    return newElement;
  }

  updateElement(id: string, updates: Partial<CanvasElement>): CanvasElement | null {
    const index = this.canvasState.elements.findIndex(el => el.id === id);
    if (index === -1) return null;

    this.canvasState.elements[index] = {
      ...this.canvasState.elements[index],
      ...updates
    };
    this.eventBus.emit('canvas:elementUpdated', this.canvasState.elements[index]);
    this.eventBus.emit('canvas:stateChanged', this.canvasState);
    return this.canvasState.elements[index];
  }

  removeElement(id: string): boolean {
    const initialLength = this.canvasState.elements.length;
    this.canvasState.elements = this.canvasState.elements.filter(el => el.id !== id);
    
    if (this.canvasState.elements.length < initialLength) {
      // Update z-indexes
      this.canvasState.elements.forEach((el, index) => {
        el.zIndex = index;
      });
      this.eventBus.emit('canvas:elementRemoved', id);
      this.eventBus.emit('canvas:stateChanged', this.canvasState);
      return true;
    }
    return false;
  }

  moveElement(id: string, x: number, y: number): CanvasElement | null {
    return this.updateElement(id, { x, y });
  }

  resizeElement(id: string, width: number, height: number): CanvasElement | null {
    return this.updateElement(id, { width, height });
  }

  rotateElement(id: string, rotation: number): CanvasElement | null {
    return this.updateElement(id, { rotation });
  }

  bringToFront(id: string): CanvasElement | null {
    const element = this.canvasState.elements.find(el => el.id === id);
    if (!element) return null;

    // Remove the element
    this.canvasState.elements = this.canvasState.elements.filter(el => el.id !== id);
    // Add it back at the end
    element.zIndex = this.canvasState.elements.length;
    this.canvasState.elements.push(element);
    
    this.eventBus.emit('canvas:elementUpdated', element);
    this.eventBus.emit('canvas:stateChanged', this.canvasState);
    return element;
  }

  sendToBack(id: string): CanvasElement | null {
    const element = this.canvasState.elements.find(el => el.id === id);
    if (!element) return null;

    // Remove the element
    this.canvasState.elements = this.canvasState.elements.filter(el => el.id !== id);
    // Add it back at the beginning
    element.zIndex = 0;
    this.canvasState.elements.unshift(element);
    
    // Update z-indexes
    this.canvasState.elements.forEach((el, index) => {
      el.zIndex = index;
    });
    
    this.eventBus.emit('canvas:elementUpdated', element);
    this.eventBus.emit('canvas:stateChanged', this.canvasState);
    return element;
  }

  clearCanvas(): void {
    this.canvasState.elements = [];
    this.eventBus.emit('canvas:cleared', null);
    this.eventBus.emit('canvas:stateChanged', this.canvasState);
  }

  renderText(text: string, x: number, y: number, options?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
  }): CanvasElement {
    return this.addElement({
      type: 'text',
      x,
      y,
      content: text,
      fontSize: options?.fontSize || 16,
      fontFamily: options?.fontFamily || 'Arial',
      color: options?.color || '#000000'
    });
  }

  renderRectangle(x: number, y: number, width: number, height: number, options?: {
    color?: string;
  }): CanvasElement {
    return this.addElement({
      type: 'rectangle',
      x,
      y,
      width,
      height,
      color: options?.color || '#000000'
    });
  }

  renderCircle(x: number, y: number, radius: number, options?: {
    color?: string;
  }): CanvasElement {
    return this.addElement({
      type: 'circle',
      x,
      y,
      width: radius * 2,
      height: radius * 2,
      color: options?.color || '#000000'
    });
  }

  renderLine(x1: number, y1: number, x2: number, y2: number, options?: {
    color?: string;
  }): CanvasElement {
    return this.addElement({
      type: 'line',
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      color: options?.color || '#000000'
    });
  }

  on<T>(event: string, callback: (payload: T) => void): void {
    this.eventBus.on(event, callback);
  }

  off<T>(event: string, callback: (payload: T) => void): void {
    this.eventBus.off(event, callback);
  }
}

export const chatClawCanvasService = new ChatClawCanvasService();
