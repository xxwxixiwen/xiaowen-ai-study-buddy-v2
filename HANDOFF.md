# HANDOFF · 小文 AI 学伴（基于 DeepTutor 二开）

需求原文：`K12_REPLICA_BRIEF.md`。内容素材：`k12-content/`（原创，勿重写）。

## 环境与启动
- Python 3.14 `.venv`，已切 **可编辑安装**：`.venv/bin/pip install -e ".[server]"`
- 前端：`cd web && npm ci --legacy-peer-deps`（Node 24 可用，官方推荐 22）
- 启动（开发）：`.venv/bin/deeptutor start --dev --no-browser` → 前端 http://localhost:3782 ，后端 http://127.0.0.1:8001
- 注意：沙箱里运行 CLI 会因写 `data/user/logs` 报 PermissionError，需在完整权限下运行。
- 界面语言：`data/user/settings/interface.json` → `language: zh`
- 截图：`cd web && npx playwright screenshot --channel=chrome --viewport-size=1440,900 --wait-for-timeout=6000 http://localhost:3782/chat out.png`

## 仓库与交接包
- GitHub（私有）：https://github.com/xxwxixiwen/xiaowen-ai-study-buddy ，分支 main
- 交接包：项目根 `handoff-xiaowen-20261027.zip`（含源码、.git、k12-content、README、.env.example、HANDOFF、需求文档；不含 .venv / node_modules / .next / data / .env）
- 换机续作：解压 → 按 README「运行步骤」安装、填 Key、重建两个知识库 → 读本文件继续

## 模型（Key 由用户在网页 设置 → 提供方 / 语言模型 / 嵌入模型 填写，禁止入库）
- LLM：DeepSeek `https://api.deepseek.com/v1`，`deepseek-chat` / `deepseek-reasoner`
- Embedding：硅基流动 `https://api.siliconflow.cn/v1`，`BAAI/bge-m3`，1024 维

## 任务进度
- [x] 1 环境：可编辑安装（含 .[dev]）、前端依赖、dev 启动、中文；DeepSeek + 硅基流动 bge-m3 已配（Key 存私有 settings），`doctor --online` 6 项全 pass
- [x] 2 白牌：完成（typecheck / i18n:check / build 通过，lint 无 error）
- [x] 3 小文 Persona/Skill + 知识库 —— 验收通过，**等待用户确认后再做 4**
- [x] 4 视频字幕问答：SRT→带时间点 Markdown（`scripts/k12/srt_to_md.py` → `k12-content/generated/`）+ 讲稿建库 `xiaowen-video`；Persona 加“必须标注视频时间点”规则；验收引用 02:36–03:04 等与字幕逐条一致。缺口与插件方案见 `k12-docs/视频字幕问答-缺口与最小插件方案.md`（未实现）
- [x] 5 收尾：新 README（原版改名 `UPSTREAM_README.md`）、`screenshots/`、`.gitignore` 增补、合规检索通过；`K12_REPLICA_BRIEF.md` / `CLAUDE.md` 含禁用品牌词，仅本地保留、已从 git 历史移除；push 命令见完成报告（未代为推送）

## 白牌改动清单（只动视觉/品牌层）
- 品牌资源：`web/public/brand/`（logo-mark.svg、avatar-xiaowen.svg、favicon 16/32、apple-touch-icon）
- 品牌常量：`web/lib/brand.ts`；品牌组件：`web/components/brand/Brand.tsx`
- 主题：`web/app/brand.css`（覆盖默认 snow 主题为暖阳珊瑚色 + 薄荷/阳光辅色、头像/气泡/加载点/登录背景/页脚）
- `web/app/layout.tsx`（标题、favicon、Nunito 圆体、lang=zh-CN）、`web/tailwind.config.js`（标题字体换圆润中文栈）
- Logo/头像替换：`SidebarShell.tsx`、`AppShell.tsx`、`ChatWorkspace.tsx`（欢迎区）、`SessionLoadingView.tsx`（加载态）、`(auth)/login|register`、`(auth)/layout.tsx`
- 文案：`web/locales/*/app.json|common.json` 取值中 DeepTutor→小文/Xiaowen，新增 `brand.*` 键，欢迎语改学伴口吻
- 去残留：`TracePresentation.tsx` 默认名、`AboutSettingsSection.tsx` 移除上游项目链接、`settings-nav.ts`、`SubagentSettingsEditor.tsx`、co-writer 示例模板、avatar-preview
- 删除 `web/public/` 下 DeepTutor logo/banner/favicon
- 后端默认 `sidebar_description`：`deeptutor/api/routers/settings.py`、`deeptutor/services/setup/init.py`
- 一键换皮：替换 `web/public/brand/*` + 改 `web/app/brand.css` 顶部 `--brand-*` + `locales` 的 `brand.*`

## 任务 3 改动
- Persona 预设：`deeptutor/services/persona/presets/xiaowen/PERSONA.md`（正文复用 k12-content 人格 + 出题/判题/引用题库附则）；已同步到 `data/user/workspace/personas/xiaowen/`
- 内置 Skill：`deeptutor/skills/builtin/xiaowen-math/SKILL.md`
- 对话提示词身份句：`deeptutor/agents/chat/prompts/{zh,en}/{agentic_chat,chat_agent}.yaml`（DeepTutor → 小文 AI 学伴）
- 测试同步：`tests/agents/chat/test_language_prompts.py`、`tests/services/persona/test_persona_service.py`
- 知识库：`deeptutor kb create xiaowen-math --doc k12-content/数学知识点-小数乘法.md --doc k12-content/数学题库-小数乘法.md`（LlamaIndex，已设为默认库；数据在 data/，不入库，换机需重建）
- 验收脚本：`.venv/bin/python scripts/k12/xiaowen_acceptance.py [decimal_point|pad_zero|quiz]`
- 网页使用：对话输入框下方选人格 xiaowen + 知识库 xiaowen-math

## 踩坑
- sharp 渲染 SVG：文件需纯 ASCII（中文用 `&#x...;` 实体），否则 XML 编码报错。
- i18n:audit 对 de/pl 严格：新增键要补到全部语种。
- 内置浏览器截图超时，改用 Playwright + 系统 Chrome。

## 待办 / 下一步
- 全部任务完成；可选：实现 `k12-docs/` 中的视频跳转插件、开启账号认证后截登录页、扩展更多年级内容。
- 原版 `.gitignore` 忽略 `/docs/`，项目文档放 `k12-docs/`。
- 建视频库：`deeptutor kb create xiaowen-video --doc k12-content/generated/示例视频-小数乘法微课-字幕时间轴.md --doc k12-content/示例视频-小数乘法微课-讲稿.md`；对话时同时挂 xiaowen-video + xiaowen-math。
- book/notebook/mastery 等提示词仍含 DeepTutor（仅模型内部），任务 5 合规检索时评估。
- 后端 pytest：partners 目录需可选依赖（telegram），跑测试时 `--ignore=tests/services/partners`。
