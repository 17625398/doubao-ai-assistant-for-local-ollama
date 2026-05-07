export type RuntimeLayerId =
  | 'native-host'
  | 'trusted-web'
  | 'ai-extension'
  | 'skill-runtime'
  | 'canvas-artifact'
  | 'native-capability'
  | 'diagnostics-ops'

export interface RuntimeLayer {
  id: RuntimeLayerId
  name: string
  description: string
  responsibilities: string[]
  localModules: string[]
  evidence: string[]
}

export interface SkillCapability {
  id: string
  name: string
  category: 'chat' | 'read' | 'search' | 'create' | 'media' | 'office' | 'developer' | 'ops'
  description: string
  entryPoints: string[]
  nativeDependencies?: string[]
  cloudDependencies?: string[]
}

export interface TrustedOriginRule {
  scope: 'INIT_MAIN_ON_ROOT_DOMAIN' | 'FRAME_URL_EXACT' | 'SCRIPT_URL_DOMAIN_IS' | 'PRIVILEGED_EXTENSION'
  hosts: string[]
  purpose: string
}

export interface DiagnosticsCapability {
  id: string
  name: string
  checks: string[]
  remediation: string[]
}

export const runtimeLayers: RuntimeLayer[] = [
  {
    id: 'native-host',
    name: '原生桌面宿主',
    description: '负责 Windows 启动、Chromium 容器、窗口、更新、崩溃处理和本地资源加载。',
    responsibilities: ['启动主窗口', '加载可信 Web 应用', '初始化内置扩展', '管理更新修复', '承载原生桥接进程'],
    localModules: ['Doubao.exe', 'Doubao.dll', 'resources.pak', 'locales', 'Doubao_elf.dll', 'Doubao_wer.dll'],
    evidence: ['Doubao.dll 是最大业务宿主模块', 'resources.pak/locales/icudtl.dat 显示 Chromium 运行时特征'],
  },
  {
    id: 'trusted-web',
    name: '可信 Web 主站',
    description: '以 doubao/cici/dola 等域名为远程业务入口，承担账号、会话、云端 AI 和内容服务。',
    responsibilities: ['加载主聊天页面', '连接云端模型和搜索服务', '承载账号体系', '下发灰度和功能配置'],
    localModules: ['manifest.json signature.trustedOrigins'],
    evidence: ['trustedOrigins 限定 doubao.com、cici.com、dola.com 与 CDN 脚本域'],
  },
  {
    id: 'ai-extension',
    name: '浏览器 AI 侧边栏扩展',
    description: 'Manifest V3 扩展，负责网页注入、侧边栏、Popup、Options 与跨页面通信。',
    responsibilities: ['网页内容提取', '侧边栏 UI', '上下文菜单', '标签页和导航感知', '与主站/飞书页面通信'],
    localModules: ['background.js', 'content.js', 'preinject.js', 'side_panel.js', 'popup.js', 'options.js'],
    evidence: ['manifest 权限包含 storage/cookies/tabs/webRequest/sidePanel/scripting/webNavigation/bookmarks'],
  },
  {
    id: 'skill-runtime',
    name: 'AI 技能运行时',
    description: '通过输入插件、引导页、Footer 插件和侧边栏应用组织多种 AI 技能。',
    responsibilities: ['技能注册', '输入框插件化', '场景引导', '上传处理', '消息渲染', '多模型/多 Bot 调度'],
    localModules: ['*-input-plugin.js', '*-skill-chat-input.js', '*-guidance-page.js', 'async-infra-message*.js'],
    evidence: ['async 模块中存在搜索、阅读、写作、代码、图片、视频、语音、PPT、音乐等插件'],
  },
  {
    id: 'canvas-artifact',
    name: 'Canvas / Artifact 工作区',
    description: '把模型输出转成可预览、可编辑、可分享的文档、代码、PPT、搜索结果和白板产物。',
    responsibilities: ['代码产物展示', '文档/DOCX 面板', 'PPT 预览', '搜索结果画布', '分享弹层'],
    localModules: ['canvas-doc-panel.js', 'canvas-code-modal.js', 'ppt-artifact-preview-canvas-plugin.js', 'white-canvas-panel.css'],
    evidence: ['大量 canvas/artifact/panel/popover 命名模块'],
  },
  {
    id: 'native-capability',
    name: '原生增强能力',
    description: '提供网络、安全、推送、音视频、GPU 渲染、Shell 集成等桌面能力。',
    responsibilities: ['RTC 音频', '网络栈', '安全风控', 'PC 推送', '文件/Shell 集成', 'GPU/软件渲染兼容'],
    localModules: ['VolcEngineRTCAudio.dll', 'sscronet.dll', 'metasecml.dll', 'pc_push.dll', 'shellext.dll', 'ffmpeg.dll'],
    evidence: ['独立 DLL 体积和命名显示音视频、网络、安全、推送职责'],
  },
  {
    id: 'diagnostics-ops',
    name: '诊断与运维体系',
    description: 'AHA 电脑医生负责网络、硬件、系统环境、三方冲突、Dump/Trace 和修复建议。',
    responsibilities: ['网络连通性诊断', '证书/代理/hosts 检测', '硬件资源检查', '三方模块与安全软件检测', 'Dump/Trace 采集'],
    localModules: ['aha_doctor.exe', 'aha_net.dll', 'doctor_sdk.dll', 'xperf.exe', 'task_host.exe'],
    evidence: ['gdstrings.ini 中存在完整网络、硬件、系统环境和高级诊断文案'],
  },
]

export const skillCapabilities: SkillCapability[] = [
  {
    id: 'web-reader',
    name: '网页阅读与总结',
    category: 'read',
    description: '读取当前网页正文、选区、多网页上下文，生成摘要、问答和建议问题。',
    entryPoints: ['desktop-ai-web-reader', 'read-website-input-plugin', 'read-sidebar-application-plugin'],
    cloudDependencies: ['页面理解模型', '摘要/问答服务'],
  },
  {
    id: 'document-reader',
    name: '文档/PDF 阅读',
    category: 'read',
    description: '支持 PDF、DOCX、表格和文件附件预览、解析、问答、导出。',
    entryPoints: ['pdf-scroll-view', 'docx-preview-modal', 'read-document-input-plugin', 'docx-export-popover'],
    nativeDependencies: ['ffmpeg.dll'],
    cloudDependencies: ['文档解析与检索服务'],
  },
  {
    id: 'deep-search',
    name: 'AI 搜索 / 深度搜索 / 学术搜索',
    category: 'search',
    description: '提供普通搜索、深度研究、学术检索和搜索结果 Canvas。',
    entryPoints: ['search-input-plugin', 'deep-search-input-plugin', 'academic-search-input-plugin', 'search-result-canvas-plugin'],
    cloudDependencies: ['搜索聚合服务', '引用与溯源服务'],
  },
  {
    id: 'writing',
    name: '写作与邮件辅助',
    category: 'create',
    description: '面向邮件、文案、改写、润色和长文生成的写作中心。',
    entryPoints: ['write-input-plugin', 'write-sidebar-application-plugin', 'writing-skill-chat-input'],
  },
  {
    id: 'coding',
    name: '编程与代码 Artifact',
    category: 'developer',
    description: '支持代码问答、解释、生成、Markdown 预览、代码 Canvas 和代码折叠。',
    entryPoints: ['coding-input-plugin', 'code-artifact-card', 'canvas-code-modal', 'code-fold-worker'],
  },
  {
    id: 'image',
    name: '图片理解与编辑',
    category: 'media',
    description: '支持图片上传、图像对话、图片生成入口和裁剪/编辑。',
    entryPoints: ['image-input-plugin', 'image-upload-tool-button-plugin', 'uploader-croper'],
    cloudDependencies: ['多模态模型', '图像生成/编辑服务'],
  },
  {
    id: 'video',
    name: '视频助手',
    category: 'media',
    description: '支持视频场景引导、视频问答、摘要、播放器和视频 Artifact 预览。',
    entryPoints: ['video-assistant', 'video-sidebar-application-plugin', 'biz-chat-media-video-player'],
    nativeDependencies: ['ffmpeg.dll'],
  },
  {
    id: 'voice',
    name: '语音与 ASR',
    category: 'media',
    description: '支持语音输入、麦克风权限引导、语音侧边栏应用和 RTC 音频。',
    entryPoints: ['asr-input-tool-button-plugin', 'mic-permission-card', 'voice-sidebar-application-plugin'],
    nativeDependencies: ['VolcEngineRTCAudio.dll', 'voixcap.dll', 'veuetsdkwrapper.dll'],
  },
  {
    id: 'ppt',
    name: 'PPT 生成',
    category: 'office',
    description: '支持 PPT 输入引导、生成、建议、Canvas 预览和分享。',
    entryPoints: ['ppt-input-plugin', 'ppt-artifact-preview-canvas-plugin', 'share-ai-ppt-modal'],
  },
  {
    id: 'feishu',
    name: '飞书/Lark 集成',
    category: 'office',
    description: '允许与飞书、Lark 文档页面通信，挂载工具栏和选择文件。',
    entryPoints: ['mount-feishu-toolbar', 'aispace-input-feishu-filelist-modal'],
    cloudDependencies: ['飞书/Lark 授权与文档服务'],
  },
]

export const trustedOriginRules: TrustedOriginRule[] = [
  {
    scope: 'INIT_MAIN_ON_ROOT_DOMAIN',
    hosts: ['doubao.com', 'cici.com', 'ciciai.com', 'dola.com'],
    purpose: '允许主应用在根域初始化。',
  },
  {
    scope: 'FRAME_URL_EXACT',
    hosts: ['www.doubao.com', 'beta.doubao.com', 'inhouse.doubao.com', 'www.cici.com', 'www.ciciai.com', 'www.dola.com'],
    purpose: '允许指定主站或灰度站点作为可信 frame。',
  },
  {
    scope: 'SCRIPT_URL_DOMAIN_IS',
    hosts: ['doubao.com', 'doubaocdn.com', 'bytedance.net', 'byteintl.net', 'cicicdn.com', 'dolacdn.com', 'ciciaicdn.com'],
    purpose: '限制业务脚本和 CDN 来源。',
  },
  {
    scope: 'PRIVILEGED_EXTENSION',
    hosts: ['chrome-extension://ai-views'],
    purpose: '允许内置扩展与主站、侧边栏和注入脚本进行特权通信。',
  },
]

export const diagnosticsCapabilities: DiagnosticsCapability[] = [
  {
    id: 'network',
    name: '网络与证书诊断',
    checks: ['代理状态', 'DNS/hosts', '公网 IP', 'Ping/TraceRoute', 'TLS 握手', '证书过期/吊销/域名不匹配'],
    remediation: ['提示关闭异常代理', '定位跨境/跨运营商访问', '导出网络检测报告'],
  },
  {
    id: 'hardware',
    name: '硬件与渲染诊断',
    checks: ['CPU/GPU 使用率', '物理内存', '页面文件', '磁盘空间', 'SSD 检测', '硬件加速兼容性'],
    remediation: ['建议关闭硬件加速', '一键调整页面文件', '提示释放磁盘或升级运行环境'],
  },
  {
    id: 'environment',
    name: '系统环境诊断',
    checks: ['URL 协议注册', '兼容模式', 'Debugger/GlobalFlag', 'Shell open command', '三方模块注入'],
    remediation: ['修复协议注册', '提示管理员权限重启', '导出冲突软件列表'],
  },
  {
    id: 'trace',
    name: '高级 Trace 与 Dump',
    checks: ['进程监控', '浏览器插件监控', '剪贴板监控', 'DNS 监控', 'RawInput 监控', 'Kernel Dump'],
    remediation: ['采集 Dump/Trace', '打包日志并提交给支持通道'],
  },
]

export const productPrinciples = [
  '本地负责体验、上下文采集、预览、桥接、诊断；云端负责模型、搜索、文档深度解析和账号服务。',
  '所有 AI 技能都通过统一输入插件、消息渲染、Canvas Artifact 和侧边栏容器组合。',
  '可信域、扩展权限和原生桥必须最小化授权并可审计。',
  '诊断能力应覆盖网络、渲染、系统环境、三方冲突和日志采集闭环。',
]
