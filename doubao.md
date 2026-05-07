继续深入分析后，可以把 `app` 里的功能体系进一步拆成三层：**原生宿主层**、**本地 AI 扩展层**、**诊断/运维层**。这次补充的是更细的证据和功能判断。

## 21. 构建体系与技术栈判断

`local_webcontents\extensions\ai-views\modern.config.json` 暴露了大量前端构建信息，可以确认这个 AI 扩展不是简单脚本，而是完整的现代前端应用。

关键信息：

- 使用 `React 18`
- 使用 `Modern.js / EdenX` 体系
- 使用 `styled-components`
- 前端包名/工程痕迹：`flow-web-monorepo`
- 扩展工程名：`app-flow-ext-next`
- 构建类型：`online`
- 区域：`cn`
- 产品标识：`doubao`
- API 域名：`www.doubao.com`
- CDN：
  - `lf-flow-web-cdn.doubaocdn.com/obj/flow-doubao`
  - `https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/flow-ext-desktop/cdn-media-assets/`
- 扩展版本：`1.0.0.4241`
- 主客户端关联版本：`2.8`

也就是说，本地 `ai-views` 扩展是豆包前端 monorepo 中的一个独立产物，专门为桌面端/浏览器侧边栏构建。

## 22. 功能开关与产品能力

`modern.config.json` 里有很多 `FEATURE_*` 开关，这些开关能进一步证明哪些能力是产品层面启用或预留的。

关键开关包括：

- `FEATURE_ENABLE_PDF_IMMERSIVE_READING: true`
- `FEATURE_ENABLE_WRITE_DOC_CARD_EXTERNAL_OPEN: true`
- `FEATURE_ENABLE_THIRD_PARTY_LOGIN: true`
- `FEATURE_ENABLE_DOUYIN: true`
- `FEATURE_ENABLE_QISHUI: true`
- `FEATURE_ENABLE_DEEP_SEARCH: true`
- `FEATURE_MULTIPLE_LLM: true`
- `FEATURE_SHOW_USER_UID: true`
- `FEATURE_REPORT_TEA: true`
- `FEATURE_ENABLE_LOG: true`
- `FEATURE_USER_PROFILE: true`
- `FEATURE_REGEN_BETTER_OR_WORSE: true`
- `FEATURE_TRANS_PREFER_LANG: true`
- `FEATURE_ENABLE_IMAGE_EDIT: true`
- `FEATURE_ENABLE_THREAD_HEADER: true`

这些说明：

1. **PDF 沉浸式阅读**是明确启用的。
2. **深度搜索**是明确启用的。
3. **多模型/多 LLM**能力是明确启用的。
4. **图片编辑**是明确启用的。
5. **第三方登录**存在。
6. **抖音登录或抖音生态能力**存在。
7. **汽水音乐相关能力**存在。
8. **用户画像/用户资料页**存在。
9. **日志与埋点上报**存在。
10. **回答反馈“更好/更差”**存在。
11. **翻译偏好语言**存在。
12. **线程化会话 Header**存在。

一些关闭或可能按环境控制的功能包括：

- `FEATURE_GOOGLE_LOGIN: false`
- `FEATURE_APPLE_LOGIN: false`
- `FEATURE_ALLOW_DEBUG: false`
- `FEATURE_ENABLE_ANTI_DEBUG: false`
- `FEATURE_ENABLE_FLOW_DOC_PDF_EXPORT: false`
- `FEATURE_ENABLE_CANVAS_PRERENDER: false`

说明国内版本不启用 Google/Apple 登录；调试能力在生产包中关闭；部分 Canvas/PDF 导出功能可能未开放或由服务端灰度控制。

## 23. 前端入口规模

`stats.meta.json` 显示这个扩展有这些入口：

- `options`
- `popup`
- `side_panel`
- `background`
- `inject`
- `content`
- `preinject`
- `subframe_scripts`
- `subframe_scripts_selection`
- `homepage_scripts`

其中最重的入口是：

- `side_panel`
- `content`
- `options`

它们共享大量 chunk。统计里显示：

- CSS 异步 chunk 数：`442`
- JS 异步 chunk 数：`970`

这说明这个“扩展”本身已经接近完整 Web App 规模，不只是浏览器插件小工具。

## 24. 本地资源体积分析

我统计了几个关键目录和文件大小：

### 24.1 总体大小

- `app`：约 `706.99 MB`
- `local_webcontents`：约 `78.25 MB`
- `aha_doctor`：约 `11.76 MB`

说明：

- 主体体积集中在原生 Chromium 宿主、主 DLL、资源包和音视频/网络 DLL。
- 本地 AI 前端扩展约 78 MB，说明本地保留了相当完整的 UI 与插件资源。
- 诊断工具约 12 MB，是独立但不算巨大的运维模块。

### 24.2 最大原生文件

主要大文件如下：

- `Doubao.dll`：约 `251.43 MB`
- `resources.pak`：约 `105.80 MB`
- `VolcEngineRTCAudio.dll`：约 `27.80 MB`
- `dxcompiler.dll`：约 `24.57 MB`
- `pc_push.dll`：约 `23.09 MB`
- `icudtl.dat`：约 `9.98 MB`
- `sscronet.dll`：约 `8.56 MB`
- `libGLESv2.dll`：约 `7.49 MB`
- `metasecml.dll`：约 `5.37 MB`
- `vk_swiftshader.dll`：约 `5.16 MB`
- `Doubao.exe`：约 `4.37 MB`
- `repair.exe`：约 `3.52 MB`
- `ghelper.exe`：约 `3.10 MB`
- `ffmpeg.dll`：约 `2.85 MB`

这进一步说明：

- `Doubao.dll` 是核心宿主/业务壳，远大于 `Doubao.exe`。
- `resources.pak` 是 Chromium/WebView 资源主体。
- `VolcEngineRTCAudio.dll` 与实时音频能力强相关。
- `pc_push.dll` 体积较大，推送/后台消息体系不是简单附属功能。
- `sscronet.dll` 是网络栈能力。
- `metasecml.dll` 是安全/风控能力。
- `dxcompiler`、`libGLESv2`、`vulkan`、`swiftshader` 说明渲染兼容性投入较多。

## 25. 异步模块按功能聚类

基于 `static\js\async` 文件名，我按关键词做了功能聚类。结果如下：

- `chat` 相关模块：约 `82` 个
- `read/pdf/doc/website` 阅读文档相关：约 `26` 个
- `canvas/artifact` 相关：约 `18` 个
- `code/coding` 相关：约 `16` 个
- `search` 相关：约 `14` 个
- `image` 相关：约 `12` 个
- `voice/asr/mic` 相关：约 `9` 个
- `video` 相关：约 `9` 个
- `write/writing` 相关：约 `8` 个
- `ppt` 相关：约 `7` 个
- `translate` 相关：约 `5` 个
- `exercise` 相关：约 `4` 个
- `music` 相关：约 `4` 个
- `feishu/lark` 相关：约 `2` 个

这可以看出功能优先级大致是：

1. 聊天框架是基础核心。
2. 阅读/文档/网页理解是重点能力。
3. Canvas/artifact 是核心交互形态。
4. 代码、搜索、图片、语音、视频是重要垂直能力。
5. 写作、PPT、翻译、教育、音乐属于技能型插件。
6. 飞书集成存在，但模块数量不算多，可能依赖外部页面或服务端能力。

## 26. 侧边栏是核心产品形态

扩展 manifest 和资源都显示 `side_panel` 是最重要入口之一：

- `side_panel.default_path = side_panel.html`
- `side_panel` 入口加载多个公共 JS chunk
- `side_panel.css`
- 大量 `*-sidebar-application-plugin.js`

例如：

- `read-sidebar-application-plugin.js`
- `search-sidebar-application-plugin.js`
- `write-sidebar-application-plugin.js`
- `image-sidebar-application-plugin.js`
- `video-sidebar-application-plugin.js`
- `voice-sidebar-application-plugin.js`
- `coding-sidebar-application-plugin.js`

这说明豆包桌面/浏览器助手的核心 UX 是：

> 用户在任意网页或任务上下文中打开侧边栏，侧边栏根据当前场景加载不同 AI 应用插件。

侧边栏不是单一聊天窗口，而是一个可挂载不同“技能应用”的容器。

## 27. 输入框插件体系

大量模块以 `*-input-plugin.js` 或 `*-skill-chat-input.js` 命名，例如：

- `search-input-plugin.js`
- `deep-search-input-plugin.js`
- `academic-search-input-plugin.js`
- `read-document-input-plugin.js`
- `read-website-input-plugin.js`
- `write-input-plugin.js`
- `coding-input-plugin.js`
- `image-input-plugin.js`
- `video-input-plugin.js`
- `ppt-input-plugin.js`
- `music-generation-input-plugin.js`
- `exercise-input-plugin.js`
- `translate-input-plugin.js`

这说明聊天输入框是插件化设计。不同场景不是完全独立页面，而是复用一套输入基础设施，通过插件决定：

- 输入框提示词。
- 附件能力。
- 工具按钮。
- 提交参数。
- 当前技能上下文。
- 引导问题。
- Footer 行为。

可以理解为：豆包内部有一个“AI 技能运行时”，输入框只是技能的统一入口。

## 28. 引导页与建议系统

很多模块以 `guidance`、`suggestions` 命名，例如：

- `deep-search-skill-guidance-page.js`
- `coding-skill-guidance-page.js`
- `image-skill-guidance-page.js`
- `video-skill-guidance-page.js`
- `ppt-skill-guidance-page.js`
- `music-skill-guidance-page.js`
- `write-skill-guidance-page.js`
- `read-pdf-skill-guidance-page-v2.js`
- `search-guidance-input-plugin.js`
- `write-center-guidance-suggestions-plugin.js`
- `read-suggestions-plugin.js`
- `ppt-suggestions-plugin.js`

说明各技能都有：

- 空状态引导页。
- 推荐问题。
- 任务模板。
- 场景化入口。
- 新手提示。

这表明豆包不是“输入什么都交给模型”的简单 Chatbot，而是大量场景都做了产品化包装。

## 29. Canvas / 白板 / Step 面板

除文档和代码 Canvas 外，还看到：

- `white-canvas-panel`
- `step-canvas-panel`
- `ratio-whiteboard-canvas.js`
- `canvas-share-popover.js`

这说明 Canvas 系统可能支持：

- 白板式内容组织。
- 分步骤结果展示。
- 文档/代码/PPT artifact 展示。
- 分享弹窗。
- 大屏或独立面板展示。

`Canvas` 可能是豆包“生成物承载层”，用于把模型输出转成可编辑、可预览、可分享的产物。

## 30. 视频能力比之前判断更明确

这次过滤到了更完整的视频模块：

- `video-assistant.js`
- `video-input-plugin.js`
- `video-guidance-input-plugin.js`
- `video-sidebar-application-plugin.js`
- `video-skill-chat-input.js`
- `video-skill-guidance-page.js`
- `video-artifact-preview-canvas-plugin.js`
- `ai-video-content.js`
- `biz-chat-media-video-player.js`

因此视频能力不只是“播放/总结”，而是有完整技能闭环：

1. 视频助手。
2. 视频输入插件。
3. 视频场景引导。
4. 视频侧边栏应用。
5. 视频技能聊天输入。
6. 视频 artifact 预览 Canvas。
7. 视频播放器。

推测可支持：

- 视频链接解析。
- 视频摘要。
- 视频问答。
- 视频内容卡片。
- 视频结果预览。
- 可能支持生成视频脚本或 AI 视频相关内容。

## 31. 语音能力也更明确

新增确认模块：

- `voice-sidebar-application-plugin.js`
- `voice-feed-list-item-tool-button-plugin.js`
- `asr-input-tool-button-plugin.js`
- `mic-permission-card.js`
- `lib-component-asr-animate.js`

结合原生 DLL：

- `VolcEngineRTCAudio.dll`
- `voixcap.dll`
- `veuetsdkwrapper.dll`

可以判断语音能力至少包含：

- 语音输入。
- 麦克风权限引导。
- ASR 动画组件。
- 语音类侧边栏应用。
- 信息流里的语音工具按钮。
- 可能使用火山引擎音频 SDK 做采集、处理或通信。

## 32. 写作中心能力

新发现的写作模块包括：

- `write-input-plugin.js`
- `write-center-guidance-input-plugin.js`
- `write-center-guidance-suggestions-plugin.js`
- `write-footer-plugin.js`
- `write-sidebar-application-plugin.js`
- `write-skill-guidance-page.js`
- `writing-skill-chat-input.js`

这说明写作不是一个简单 prompt，而可能有“写作中心”：

- 输入引导。
- 建议模板。
- 写作 Footer 操作。
- 侧边栏应用。
- 聊天输入技能。
- 生成结果后续编辑。

结合文档 Canvas，写作结果可能可以进入文档编辑/导出流程。

## 33. 翻译能力更完整

模块包括：

- `translate-input-plugin.js`
- `translate-guidance-input-plugin.js`
- `translate-guidance-chat-footer-plugin.js`
- `translate-sidebar-plugin.js`
- `translate-skill-guidance-page.js`

说明翻译功能包含：

- 输入插件。
- 引导页。
- 聊天 Footer 插件。
- 侧边栏翻译工具。
- 偏好语言配置，前面 `FEATURE_TRANS_PREFER_LANG` 已确认。

这说明翻译可以是单独技能，也可以作为聊天结果底部操作或网页侧边栏工具。

## 34. PPT 能力更完整

模块包括：

- `ppt-input-plugin.js`
- `ppt-guidance-input-plugin.js`
- `ppt-skill-chat-input.js`
- `ppt-skill-guidance-page.js`
- `ppt-artifact-preview-canvas-plugin.js`
- `ppt-suggestions-plugin.js`
- `share-ai-ppt-modal.js`

说明 PPT 功能可能支持：

- 根据主题生成 PPT。
- 输入引导。
- 推荐模板/建议。
- PPT artifact 预览。
- 分享 AI PPT。
- 结果 Canvas 化展示。

## 35. 音乐能力与“汽水”开关

模块包括：

- `music-generation-input-plugin.js`
- `music-guidance-input-plugin.js`
- `music-skill-chat-input.js`
- `music-skill-guidance-page.js`

配置中还有：

- `FEATURE_ENABLE_QISHUI: true`
- `featureQiShui: true`

“汽水”很可能对应字节系音乐生态。结合音乐生成模块，说明音乐功能可能既包含生成入口，也可能和汽水音乐或音频服务有联动。

## 36. 多模型能力

配置中：

- `FEATURE_MULTIPLE_LLM: true`
- `featureMultipleLLM: true`
- `FEATURE_MULTIPLE_BOT` 在不同变量中有 false/true 两套展开结果，说明可能受环境或灰度影响。

这意味着客户端至少预留：

- 多模型选择。
- 多 Bot/智能体。
- 不同技能调用不同模型。
- 用户可见或服务端下发的模型/机器人配置。

## 37. 埋点、监控与日志

构建配置中有：

- `slardar`
- `FEATURE_REPORT_TEA: true`
- `FEATURE_ENABLE_LOG: true`
- `clear_after_upload: true`
- `bid: flow_web_ext`
- `release: 2.8_1.0.0.4241`

说明前端使用了字节内部常见监控/埋点体系：

- Slardar：前端性能与错误监控。
- Tea：行为埋点/数据分析。
- 日志上传后清理。
- release 标识绑定客户端版本和扩展版本。

结合原生：

- `simplelog.dll`
- `logifier_retrieval.dll`
- `Doubao_wer.dll`
- `aha_doctor`

可以判断它有完整的前端、原生、诊断三套观测能力。

## 38. 诊断工具的文案证据

`aha_doctor\resources\lang\zh_CN\gdstrings.ini` 进一步确认诊断工具名为：

- `AHA电脑医生`

它有三大主 Tab/能力：

1. **异常诊断**
2. **系统信息**
3. **网络诊断/高级诊断相关页面**

文案中明确存在以下检测项。

### 38.1 三方模块与安全软件检测

包括：

- 三方模块检测。
- 安全软件检测。
- 驱动软件列表。
- 防火墙检测。
- 网络栈注入检测。

检测目标是：

- 影响软件正常运行。
- 引发卡死。
- 引发崩溃。
- 资源文件被篡改。
- 网络栈被注入。

### 38.2 网络检测

包括：

- 网络硬件信息。
- 网络配置数据。
- 网络访问情况。
- 代理检测。
- 本机 IP。
- 本机 DNS。
- 公网 IP。
- hosts 解析检查。
- 访问链接延迟。
- 地区/运营商。
- 请求慢。
- 超时。
- 域名解析失败。
- 连接超时。
- 连接失败。
- 代理连接失败。
- TLS 握手失败。
- 证书验证失败。
- 证书域名不匹配。
- 证书过期。
- 证书颁发机构不可信。
- 证书吊销。
- 跨境访问。
- 跨运营商访问。

这对豆包这种云端 AI 客户端非常重要，因为多数核心能力依赖远程 API 和 CDN。

### 38.3 硬件检测

包括：

- CPU 使用率过高。
- 物理内存不足。
- 虚拟内存不足。
- 磁盘使用率过高。
- 数据盘空间不足。
- 系统盘非 SSD。
- GPU 使用率过高。
- 硬件加速。
- CPU 型号兼容性问题。
- 白屏/崩溃建议。

这说明客户端非常关注 Chromium 渲染、GPU 加速、内存和磁盘性能。

### 38.4 系统环境检测

包括：

- 应用环境配置。
- 程序重定向。
- 程序调试设置。
- 兼容模式。
- URL 协议注册。
- `shell\open\command` 键检测。
- 可执行文件路径匹配。

这说明客户端可能注册 URL Scheme，用于从网页或其他应用拉起豆包，例如 `doubao://...` 一类协议。

### 38.5 系统信息能力

包括：

- 磁盘。
- 内存。
- 物理内存。
- 虚拟内存。
- 页面文件。
- 分辨率。
- 刷新率。
- 连接显卡。
- 使用率。
- 可用空间。
- 一键修改页面文件大小。

“一键修改页面文件”说明诊断工具不只是只读检测，也具备一定系统修复操作能力。

## 39. 原生组件职责再细化

结合体积和名称，可以更细地划分原生组件：

### 39.1 主壳组件

- `Doubao.exe`
- `Doubao.dll`
- `resources.pak`
- `doubao_100_percent.pak`
- `doubao_200_percent.pak`
- `locales`
- `icudtl.dat`

职责：

- 主窗口。
- Chromium 宿主。
- Web 页面加载。
- 国际化。
- 资源管理。
- 桌面 UI 包装。

### 39.2 渲染/图形组件

- `libEGL.dll`
- `libGLESv2.dll`
- `vulkan-1.dll`
- `vk_swiftshader.dll`
- `dxcompiler.dll`
- `dxil.dll`
- `d3dcompiler_47.dll`

职责：

- GPU 加速。
- WebGL。
- Vulkan/DirectX 兼容。
- SwiftShader 软件渲染 fallback。
- 降低白屏/黑屏风险。

### 39.3 音视频组件

- `ffmpeg.dll`
- `VolcEngineRTCAudio.dll`
- `voixcap.dll`
- `veuetsdkwrapper.dll`

职责：

- 音视频解码。
- RTC 音频。
- 语音采集。
- ASR 或语音通话底层支持。
- 视频/音频内容处理。

### 39.4 网络与安全组件

- `sscronet.dll`
- `aha_net.dll`
- `metasecml.dll`
- `doctor_sdk.dll`

职责：

- HTTP/HTTPS 网络栈。
- 网络诊断。
- 证书/代理/连通性检测。
- 风控安全。
- 设备环境校验。

### 39.5 推送与后台能力

- `pc_push.dll`
- `push_detect.exe`

职责：

- PC 消息推送。
- 后台通知。
- 推送通道检测。
- 可能用于会话提醒或系统通知。

### 39.6 代理与桥接

- `Doubao_proxy.exe`
- `Doubao_browser_proxy.exe`

职责推测：

- 浏览器进程与原生进程桥接。
- 本地能力代理。
- 权限隔离。
- 文件/网络/系统能力转发。
- 可能支持扩展与宿主通信。

### 39.7 Shell 与系统集成

- `shellext.dll`
- `shellextcore.dll`

职责推测：

- Windows 资源管理器右键菜单。
- 文件发送/上传到豆包。
- 文档快速处理入口。
- 系统文件关联或 Shell 扩展。

### 39.8 更新修复

- `update.exe`
- `repair.exe`
- `uninstall.exe`
- `launcher\Doubao.exe`
- `launcher\uninstall.exe`

职责：

- 版本更新。
- 修复安装。
- 卸载。
- 外层启动器。
- 首次运行与升级流程。

## 40. 可信域与扩展连接范围

扩展的 `externally_connectable` 允许这些页面和扩展通信：

- `https://*.doubao.com/*`
- `https://*.cici.com/*`
- `https://*.ciciai.com/*`
- `https://*.dola.com/*`
- `https://*.larkoffice.com/*`
- `https://*.feishu.cn/*`

这说明扩展和这些网页之间可以建立跨上下文通信。

其中：

- `doubao/cici/dola` 是豆包自身不同品牌/域名。
- `larkoffice/feishu` 是办公生态接入。

这对网页总结、飞书文档处理、主站联动和侧边栏调用都很关键。

## 41. 运行时数据流推测

结合所有证据，典型“总结当前网页”的数据流可能是：

1. 用户打开任意网页。
2. `preinject.js` 在 `document_start` 早期建立桥接。
3. `content.js` 在 `document_end` 注入页面。
4. 内容脚本读取 DOM、正文、标题、选区或页面元数据。
5. 通过扩展消息发送给 `background.js` 或 `side_panel.js`。
6. 侧边栏加载 `read-website-*` 插件。
7. 插件构造上下文请求。
8. 请求发往 `www.doubao.com` 或相关 API/CDN。
9. 返回结果通过聊天消息系统渲染。
10. 如果结果包含文档、代码、图表，则加载 Canvas/artifact 模块。
11. 埋点通过 Tea/Slardar 上报。
12. 出错时进入前端错误监控或原生诊断链路。

## 42. 运行时“文档问答”数据流推测

1. 用户上传 PDF/DOCX。
2. `file-upload-tool-button-plugin.js` 或 `async-business-input-engine-upload.js` 接管上传。
3. `mime.js` 判断文件类型。
4. PDF 可能由 `pdf.worker.min.js` 和 `new-pdf-scroll-view.js` 做本地预览。
5. DOCX 由 `docx-preview-modal.js`、`inline-docx-panel.js` 等展示。
6. 文档内容或文件 ID 发送到后端。
7. 后端解析、切分、索引。
8. 用户问题走 `read-doc-chat-input.js` 或 `read-document-input-plugin.js`。
9. 回答通过消息系统和 Canvas 文档面板展示。
10. 需要导出时进入 `docx-export-popover.js`。

## 43. 运行时“代码任务”数据流推测

1. 用户选择编码/代码技能。
2. 输入框加载 `coding-input-plugin.js` 或 `coding-skill-chat-input.js`。
3. 回答消息内代码块由 Markdown/Highlight 渲染。
4. 复杂代码结果以 `code-artifact-card.js` 展示。
5. 点击进入 `canvas-code-modal.js` 或 `coding-chat-canvas-plugin.js`。
6. `code-canvas-popover-toolbar.js` 提供复制、预览、展开等操作。
7. `code-fold-worker.js` 支持代码折叠或结构分析。

## 44. 运行时“PPT 生成”数据流推测

1. 用户进入 PPT 技能。
2. 加载 `ppt-skill-guidance-page.js` 或 `ppt-input-plugin.js`。
3. 输入主题或上传资料。
4. 生成结果形成 PPT artifact。
5. `ppt-artifact-preview-canvas-plugin.js` 负责预览。
6. `share-ai-ppt-modal.js` 负责分享。
7. `ppt-suggestions-plugin.js` 提供修改建议或模板建议。

## 45. 运行时“视频助手”数据流推测

1. 用户在视频网页或侧边栏进入视频技能。
2. `video-sidebar-application-plugin.js` 或 `video-assistant.js` 处理场景。
3. `video-input-plugin.js` 构建输入。
4. 视频内容通过页面注入、链接解析或服务端解析获得。
5. 回答通过 `video-skill-chat-input.js` 与聊天系统渲染。
6. 结果可通过 `video-artifact-preview-canvas-plugin.js` 预览。
7. 视频片段或媒体由 `biz-chat-media-video-player.js` 播放。

## 46. “原生程序”的核心不是本地推理

从目前文件看不到大型本地模型权重，也没有典型推理运行时模型文件，例如 GGUF、ONNX 大模型、TensorRT engine 等。虽然有不少 AI 功能模块，但它们是前端技能插件和原生宿主能力。

因此更准确的判断是：

> 这个原生程序是“豆包云端 AI 服务的 Windows 客户端与浏览器 AI 助手容器”，不是本地大模型推理程序。

本地承担的是：

- UI。
- 页面上下文采集。
- 文件上传和预览。
- 音视频采集/播放。
- 系统集成。
- 网络与安全。
- 推送。
- 诊断。
- 更新。

模型推理、搜索、文档深度解析等核心计算大概率在云端。

## 47. 最值得关注的核心子系统

如果你要继续逆向或做二次分析，优先级建议如下：

### 第一优先级：`Doubao.dll`

体积最大，约 251 MB。它应该包含：

- 主 Chromium 宿主逻辑。
- 原生桥。
- 安全策略。
- 窗口管理。
- 扩展加载逻辑。
- 可能的 IPC 接口。

### 第二优先级：`local_webcontents\extensions\ai-views`

这是最容易分析业务功能的部分。尤其：

- `manifest.json`
- `background.js`
- `content.js`
- `preinject.js`
- `side_panel.js`
- `static\js\async\*-plugin.js`

可以还原产品功能、权限、交互和接口调用。

### 第三优先级：`aha_doctor`

用于理解客户端排障、安全检测、系统依赖、网络要求。

### 第四优先级：网络与安全 DLL

- `sscronet.dll`
- `metasecml.dll`
- `aha_net.dll`

它们决定请求、证书、安全、风控、代理等行为。

### 第五优先级：音视频 DLL

- `VolcEngineRTCAudio.dll`
- `voixcap.dll`
- `ffmpeg.dll`

用于确认语音、视频、RTC、ASR 的本地能力边界。

## 48. 更精确的核心功能分层总结

最终可以把 `app` 的核心功能归纳为：

### A. 主客户端能力

- 启动主窗口。
- 嵌入 Chromium。
- 加载豆包 Web 主站。
- 管理可信域。
- 加载本地扩展。
- 桌面通知。
- 自动更新。
- 崩溃处理。
- 系统修复。

### B. 浏览器 AI 助手能力

- 任意网页注入。
- 侧边栏 AI。
- 网页总结。
- 网页翻译。
- 网页问答。
- 选区工具。
- 飞书/Lark 集成。
- 书签/标签页/导航感知。

### C. AI 技能能力

- 通用聊天。
- 搜索。
- 深度搜索。
- 学术搜索。
- PDF 阅读。
- DOCX 阅读。
- 多网页阅读。
- 写作。
- 翻译。
- 编程。
- 图片。
- 视频。
- 语音。
- PPT。
- 音乐。
- 播客。
- 练习/教育。

### D. Artifact/Canvas 能力

- 代码 artifact。
- 文档 Canvas。
- DOCX Canvas。
- PPT 预览。
- 搜索结果 Canvas。
- 白板 Canvas。
- 分享弹窗。
- 分步骤面板。

### E. 原生增强能力

- 音视频解码。
- RTC 音频。
- ASR 输入支持。
- GPU 加速。
- 网络栈。
- 安全风控。
- 代理桥接。
- Shell 扩展。
- PC 推送。

### F. 运维诊断能力

- 网络检测。
- 代理检测。
- 证书检测。
- hosts 检测。
- 网络栈注入检测。
- 防火墙检测。
- 安全软件检测。
- 三方模块检测。
- CPU/GPU/内存/磁盘检测。
- 崩溃/Dump/Trace 采集。
- URL 协议检测。
- 页面文件修复。

## 49. 结论

继续深入后可以更确定地说：

`app` 目录中的程序是一个基于 Chromium 的豆包 Windows 桌面客户端，内置了一个大规模 Manifest V3 AI 浏览器扩展。它的核心业务是把豆包云端 AI 能力以桌面窗口、浏览器侧边栏、页面注入、文件预览、Canvas artifact、系统集成等方式包装成本地原生体验。

最核心的三件事是：

1. **云端 AI 服务的桌面容器**
   - `Doubao.exe` / `Doubao.dll` / Chromium 资源负责运行环境。

2. **本地浏览器 AI 助手扩展**
   - `local_webcontents\extensions\ai-views` 负责侧边栏、网页注入、AI 技能插件和交互 UI。

3. **原生增强与诊断体系**
   - 网络、安全、音视频、推送、Shell、更新、修复、AHA 电脑医生共同保证桌面级体验和可维护性。
