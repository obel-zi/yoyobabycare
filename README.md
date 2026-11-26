# yoyobabycare
a tool to take care of my baby yoyo

# BabyCare 家庭育儿助手

BabyCare 是面向 0–3 岁宝宝家庭的中文育儿记录 PWA，重点覆盖 0–12 个月。支持喂养、补剂、排便、玩耍、睡眠和健康测量记录，目标是让爸爸、妈妈和其他照护者协同记录。

## 技术栈
- Next.js 15 + React 19 + TypeScript
- Tailwind CSS
- Supabase PostgreSQL / Auth（云端同步接入阶段）
- PWA manifest + Service Worker
- Vercel 部署

## 本地运行
```bash
npm install
cp .env.example .env.local
npm run dev
```
打开 http://localhost:3000。未配置 Supabase 时目前运行本机演示模式，数据保存在浏览器 localStorage。

## 部署
1. 将仓库导入 Vercel，Framework 选择 Next.js。
2. Node.js 版本使用 22。
3. 配置环境变量 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
4. 部署后先验证预览环境，再配置正式域名。

## 重要开发边界
- 当前页面是可运行的交互原型，不代表云同步、成员邀请、服务端提醒已完成。
- 成长百分位不得使用编造数据。正式计算前须导入并核验中国 WS/T 423—2022 与 WHO 标准原始数据，记录标准版本和算法版本。
- 浏览器通知不保证在浏览器关闭后触发；可靠提醒需服务端定时任务与 Web Push。
- 健康信息仅作记录，不替代医疗诊断。

## 后续里程碑
1. Supabase Auth、家庭/宝宝建档、RLS 与多成员共享。
2. 照护记录和健康测量云端 CRUD、离线队列与同步冲突处理。
3. 任务模板、服务端定时提醒、Web Push。
4. 经核验的 WHO 与中国生长标准数据导入及 Z-score/百分位计算。
5. 数据导出/删除、隐私说明、备份恢复和端到端测试。
