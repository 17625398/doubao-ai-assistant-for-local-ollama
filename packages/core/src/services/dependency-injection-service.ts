// 依赖注入服务

/**
 * 依赖项类型
 */
export type Dependency<T> = T | (() => T);

/**
 * 依赖注入容器
 */
export class DependencyInjectionContainer {
  private static instance: DependencyInjectionContainer;
  private dependencies: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): DependencyInjectionContainer {
    if (!DependencyInjectionContainer.instance) {
      DependencyInjectionContainer.instance = new DependencyInjectionContainer();
    }
    return DependencyInjectionContainer.instance;
  }

  /**
   * 注册依赖
   */
  register<T>(key: string, dependency: Dependency<T>, isSingleton: boolean = false): void {
    this.dependencies.set(key, dependency);
    if (isSingleton) {
      // 立即初始化单例
      this.singletons.set(key, this.resolve<T>(key));
    }
  }

  /**
   * 解析依赖
   */
  resolve<T>(key: string): T {
    // 检查是否有单例实例
    if (this.singletons.has(key)) {
      return this.singletons.get(key);
    }

    const dependency = this.dependencies.get(key);
    if (!dependency) {
      throw new Error(`Dependency ${key} not registered`);
    }

    // 如果是函数，执行函数获取实例
    if (typeof dependency === 'function') {
      return dependency();
    }

    // 否则直接返回依赖
    return dependency;
  }

  /**
   * 检查依赖是否已注册
   */
  has(key: string): boolean {
    return this.dependencies.has(key);
  }

  /**
   * 移除依赖
   */
  remove(key: string): void {
    this.dependencies.delete(key);
    this.singletons.delete(key);
  }

  /**
   * 清空所有依赖
   */
  clear(): void {
    this.dependencies.clear();
    this.singletons.clear();
  }

  /**
   * 获取所有依赖键
   */
  getKeys(): string[] {
    return Array.from(this.dependencies.keys());
  }
}

/**
 * 依赖注入装饰器
 */
export function Inject(key: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: function () {
        const container = DependencyInjectionContainer.getInstance();
        return container.resolve(key);
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * 全局依赖注入容器实例
 */
export const container = DependencyInjectionContainer.getInstance();
