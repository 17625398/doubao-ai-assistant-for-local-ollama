// 插件系统模块
import { logger } from './logger';
/**
 * 插件类型
 */
export var PluginType;
(function (PluginType) {
    PluginType["DOCUMENT_PARSER"] = "document_parser";
    PluginType["AI_PROCESSOR"] = "ai_processor";
    PluginType["UI_COMPONENT"] = "ui_component";
    PluginType["UTILITY"] = "utility";
})(PluginType || (PluginType = {}));
/**
 * 插件管理器
 */
export class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.initialized = false;
    }
    /**
     * 注册插件
     */
    async registerPlugin(plugin) {
        try {
            await plugin.initialize();
            this.plugins.set(plugin.metadata.name, plugin);
            logger.info(`Plugin registered: ${plugin.metadata.name} (${plugin.metadata.type})`);
        }
        catch (error) {
            logger.error(`Failed to register plugin ${plugin.metadata.name}:`, error);
            throw error;
        }
    }
    /**
     * 卸载插件
     */
    async unregisterPlugin(name) {
        const plugin = this.plugins.get(name);
        if (plugin) {
            try {
                await plugin.destroy();
                this.plugins.delete(name);
                logger.info(`Plugin unregistered: ${name}`);
            }
            catch (error) {
                logger.error(`Failed to unregister plugin ${name}:`, error);
                throw error;
            }
        }
    }
    /**
     * 获取插件
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }
    /**
     * 获取指定类型的插件
     */
    getPluginsByType(type) {
        return Array.from(this.plugins.values()).filter(plugin => plugin.metadata.type === type);
    }
    /**
     * 获取所有插件
     */
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }
    /**
     * 初始化所有插件
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        const plugins = Array.from(this.plugins.values());
        for (let i = 0; i < plugins.length; i++) {
            const plugin = plugins[i];
            try {
                await plugin.initialize();
            }
            catch (error) {
                logger.error(`Failed to initialize plugin ${plugin.metadata.name}:`, error);
            }
        }
        this.initialized = true;
        logger.info('All plugins initialized');
    }
    /**
     * 销毁所有插件
     */
    async destroy() {
        const plugins = Array.from(this.plugins.values());
        for (let i = 0; i < plugins.length; i++) {
            const plugin = plugins[i];
            try {
                await plugin.destroy();
            }
            catch (error) {
                logger.error(`Failed to destroy plugin ${plugin.metadata.name}:`, error);
            }
        }
        this.plugins.clear();
        this.initialized = false;
        logger.info('All plugins destroyed');
    }
    /**
     * 加载插件
     */
    async loadPlugin(pluginPath) {
        try {
            // 这里是插件加载的占位符
            // 实际实现中可能需要动态导入或加载外部插件
            logger.info(`Loading plugin from: ${pluginPath}`);
            throw new Error('Plugin loading not implemented');
        }
        catch (error) {
            logger.error(`Failed to load plugin from ${pluginPath}:`, error);
            throw error;
        }
    }
}
/**
 * 全局插件管理器实例
 */
export const pluginManager = new PluginManager();
/**
 * 创建文档解析器插件
 */
export function createDocumentParserPlugin(metadata, parser) {
    return {
        metadata: {
            ...metadata,
            type: PluginType.DOCUMENT_PARSER,
        },
        parser,
        async initialize() {
            logger.info(`Initializing document parser plugin: ${this.metadata.name}`);
            // 初始化逻辑
        },
        async destroy() {
            logger.info(`Destroying document parser plugin: ${this.metadata.name}`);
            // 清理逻辑
        },
    };
}
export default PluginManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2luLXN5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9wbHVnaW4tc3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVM7QUFHVCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRWxDOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksVUFLWDtBQUxELFdBQVksVUFBVTtJQUNwQixpREFBbUMsQ0FBQTtJQUNuQywyQ0FBNkIsQ0FBQTtJQUM3QiwyQ0FBNkIsQ0FBQTtJQUM3QixpQ0FBbUIsQ0FBQTtBQUNyQixDQUFDLEVBTFcsVUFBVSxLQUFWLFVBQVUsUUFLckI7QUE4QkQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sYUFBYTtJQUExQjtRQUNVLFlBQU8sR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN6QyxnQkFBVyxHQUFZLEtBQUssQ0FBQztJQTZHdkMsQ0FBQztJQTNHQzs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBYztRQUNqQyxJQUFJLENBQUM7WUFDSCxNQUFNLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLENBQUMsS0FBSyxDQUFDLDZCQUE2QixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFFLE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNI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LE9BQU87UUFDVCxDQUFDO0tBQ0YsQ0FBQztBQUNKLENBQUM7QUFFRCxlQUFlLGFBQWEsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIOaPkuS7tuezu+e7n+aooeWdl1xuXG5pbXBvcnQgeyBEb2N1bWVudFBhcnNlciwgRG9jdW1lbnRUeXBlLCBEb2N1bWVudFBhcnNlUmVzdWx0LCBQYXJzZU9wdGlvbnMgfSBmcm9tICcuLi90eXBlcy9kb2N1bWVudCc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5cbi8qKlxuICog5o+S5Lu257G75Z6LXG4gKi9cbmV4cG9ydCBlbnVtIFBsdWdpblR5cGUge1xuICBET0NVTUVOVF9QQVJTRVIgPSAnZG9jdW1lbnRfcGFyc2VyJyxcbiAgQUlfUFJPQ0VTU09SID0gJ2FpX3Byb2Nlc3NvcicsXG4gIFVJX0NPTVBPTkVOVCA9ICd1aV9jb21wb25lbnQnLFxuICBVVElMSVRZID0gJ3V0aWxpdHknLFxufVxuXG4vKipcbiAqIOaPkuS7tuWFg+aVsOaNrlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsdWdpbk1ldGFkYXRhIHtcbiAgbmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIHR5cGU6IFBsdWdpblR5cGU7XG4gIGF1dGhvcj86IHN0cmluZztcbiAgZGVwZW5kZW5jaWVzPzogc3RyaW5nW107XG59XG5cbi8qKlxuICog5o+S5Lu25o6l5Y+jXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGx1Z2luIHtcbiAgbWV0YWRhdGE6IFBsdWdpbk1ldGFkYXRhO1xuICBpbml0aWFsaXplKCk6IFByb21pc2U8dm9pZD47XG4gIGRlc3Ryb3koKTogUHJvbWlzZTx2b2lkPjtcbn1cblxuLyoqXG4gKiDmlofmoaPop6PmnpDlmajmj5Lku7bmjqXlj6NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEb2N1bWVudFBhcnNlclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHBhcnNlcjogRG9jdW1lbnRQYXJzZXI7XG59XG5cbi8qKlxuICog5o+S5Lu2566h55CG5ZmoXG4gKi9cbmV4cG9ydCBjbGFzcyBQbHVnaW5NYW5hZ2VyIHtcbiAgcHJpdmF0ZSBwbHVnaW5zOiBNYXA8c3RyaW5nLCBQbHVnaW4+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGluaXRpYWxpemVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIOazqOWGjOaPkuS7tlxuICAgKi9cbiAgYXN5bmMgcmVnaXN0ZXJQbHVnaW4ocGx1Z2luOiBQbHVnaW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgcGx1Z2luLmluaXRpYWxpemUoKTtcbiAgICAgIHRoaXMucGx1Z2lucy5zZXQocGx1Z2luLm1ldGFkYXRhLm5hbWUsIHBsdWdpbik7XG4gICAgICBsb2dnZXIuaW5mbyhgUGx1Z2luIHJlZ2lzdGVyZWQ6ICR7cGx1Z2luLm1ldGFkYXRhLm5hbWV9ICgke3BsdWdpbi5tZXRhZGF0YS50eXBlfSlgKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gcmVnaXN0ZXIgcGx1Z2luICR7cGx1Z2luLm1ldGFkYXRhLm5hbWV9OmAsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDljbjovb3mj5Lku7ZcbiAgICovXG4gIGFzeW5jIHVucmVnaXN0ZXJQbHVnaW4obmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGx1Z2luID0gdGhpcy5wbHVnaW5zLmdldChuYW1lKTtcbiAgICBpZiAocGx1Z2luKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBwbHVnaW4uZGVzdHJveSgpO1xuICAgICAgICB0aGlzLnBsdWdpbnMuZGVsZXRlKG5hbWUpO1xuICAgICAgICBsb2dnZXIuaW5mbyhgUGx1Z2luIHVucmVnaXN0ZXJlZDogJHtuYW1lfWApO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gdW5yZWdpc3RlciBwbHVnaW4gJHtuYW1lfTpgLCBlcnJvcik7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bmj5Lku7ZcbiAgICovXG4gIGdldFBsdWdpbihuYW1lOiBzdHJpbmcpOiBQbHVnaW4gfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnBsdWdpbnMuZ2V0KG5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluaMh+Wumuexu+Wei+eahOaPkuS7tlxuICAgKi9cbiAgZ2V0UGx1Z2luc0J5VHlwZSh0eXBlOiBQbHVnaW5UeXBlKTogUGx1Z2luW10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMucGx1Z2lucy52YWx1ZXMoKSkuZmlsdGVyKHBsdWdpbiA9PiBwbHVnaW4ubWV0YWRhdGEudHlwZSA9PT0gdHlwZSk7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5omA5pyJ5o+S5Lu2XG4gICAqL1xuICBnZXRBbGxQbHVnaW5zKCk6IFBsdWdpbltdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLnBsdWdpbnMudmFsdWVzKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIOWIneWni+WMluaJgOacieaPkuS7tlxuICAgKi9cbiAgYXN5bmMgaW5pdGlhbGl6ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5pbml0aWFsaXplZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBsdWdpbnMgPSBBcnJheS5mcm9tKHRoaXMucGx1Z2lucy52YWx1ZXMoKSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBwbHVnaW4gPSBwbHVnaW5zW2ldO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgcGx1Z2luLmluaXRpYWxpemUoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGluaXRpYWxpemUgcGx1Z2luICR7cGx1Z2luLm1ldGFkYXRhLm5hbWV9OmAsIGVycm9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICBsb2dnZXIuaW5mbygnQWxsIHBsdWdpbnMgaW5pdGlhbGl6ZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDplIDmr4HmiYDmnInmj5Lku7ZcbiAgICovXG4gIGFzeW5jIGRlc3Ryb3koKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGx1Z2lucyA9IEFycmF5LmZyb20odGhpcy5wbHVnaW5zLnZhbHVlcygpKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBwbHVnaW4uZGVzdHJveSgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gZGVzdHJveSBwbHVnaW4gJHtwbHVnaW4ubWV0YWRhdGEubmFtZX06YCwgZXJyb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucGx1Z2lucy5jbGVhcigpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICBsb2dnZXIuaW5mbygnQWxsIHBsdWdpbnMgZGVzdHJveWVkJyk7XG4gIH1cblxuICAvKipcbiAgICog5Yqg6L295o+S5Lu2XG4gICAqL1xuICBhc3luYyBsb2FkUGx1Z2luKHBsdWdpblBhdGg6IHN0cmluZyk6IFByb21pc2U8UGx1Z2luPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIOi/memHjOaYr+aPkuS7tuWKoOi9veeahOWNoOS9jeesplxuICAgICAgLy8g5a6e6ZmF5a6e546w5Lit5Y+v6IO96ZyA6KaB5Yqo5oCB5a+85YWl5oiW5Yqg6L295aSW6YOo5o+S5Lu2XG4gICAgICBsb2dnZXIuaW5mbyhgTG9hZGluZyBwbHVnaW4gZnJvbTogJHtwbHVnaW5QYXRofWApO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbHVnaW4gbG9hZGluZyBub3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gbG9hZCBwbHVnaW4gZnJvbSAke3BsdWdpblBhdGh9OmAsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIOWFqOWxgOaPkuS7tueuoeeQhuWZqOWunuS+i1xuICovXG5leHBvcnQgY29uc3QgcGx1Z2luTWFuYWdlciA9IG5ldyBQbHVnaW5NYW5hZ2VyKCk7XG5cbi8qKlxuICog5Yib5bu65paH5qGj6Kej5p6Q5Zmo5o+S5Lu2XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEb2N1bWVudFBhcnNlclBsdWdpbihcbiAgbWV0YWRhdGE6IE9taXQ8UGx1Z2luTWV0YWRhdGEsICd0eXBlJz4sXG4gIHBhcnNlcjogRG9jdW1lbnRQYXJzZXJcbik6IERvY3VtZW50UGFyc2VyUGx1Z2luIHtcbiAgcmV0dXJuIHtcbiAgICBtZXRhZGF0YToge1xuICAgICAgLi4ubWV0YWRhdGEsXG4gICAgICB0eXBlOiBQbHVnaW5UeXBlLkRPQ1VNRU5UX1BBUlNFUixcbiAgICB9LFxuICAgIHBhcnNlcixcbiAgICBhc3luYyBpbml0aWFsaXplKCkge1xuICAgICAgbG9nZ2VyLmluZm8oYEluaXRpYWxpemluZyBkb2N1bWVudCBwYXJzZXIgcGx1Z2luOiAke3RoaXMubWV0YWRhdGEubmFtZX1gKTtcbiAgICAgIC8vIOWIneWni+WMlumAu+i+kVxuICAgIH0sXG4gICAgYXN5bmMgZGVzdHJveSgpIHtcbiAgICAgIGxvZ2dlci5pbmZvKGBEZXN0cm95aW5nIGRvY3VtZW50IHBhcnNlciBwbHVnaW46ICR7dGhpcy5tZXRhZGF0YS5uYW1lfWApO1xuICAgICAgLy8g5riF55CG6YC76L6RXG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgUGx1Z2luTWFuYWdlcjtcbiJdfQ==