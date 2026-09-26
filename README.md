# 想想和想想妈的购买清单

想想和想想妈的母婴用品购买清单（纯静态应用）：按月购买计划、必买提醒、预算统计、价格品牌可编辑、多端实时同步。
数据存放在 Supabase，前端托管在 GitHub Pages，全家人打开同一个链接即可共享同一份清单。

## 项目结构

```
├── index.html          # 页面主体（UI + 渲染逻辑，单文件无框架）
├── config.js           # Supabase 连接配置（填 URL 和 anon key）
├── db-adapter.js       # 数据适配器：把页面数据层映射到 Supabase items 表
├── supabase/
│   ├── schema.sql      # 建表 + RLS 策略 + 实时推送（执行一次）
│   └── seed.sql        # 现有清单数据（72 条，可选）
└── data/
    └── items-export.csv # 原始数据备份
```

## 部署步骤

### 1. 创建 Supabase 项目

1. 到 [supabase.com](https://supabase.com) 注册并新建一个项目（免费额度足够家庭使用）。
2. 左侧 **SQL Editor** → New query，粘贴 `supabase/schema.sql` 全部内容并 Run（建表 + 权限 + 实时）。
3. 想带入现有数据的话，再执行一次 `supabase/seed.sql`。
4. 左侧 **Project Settings → API**：
   - 复制 **Project URL** → 填入 `config.js` 的 `window.SUPABASE_URL`
   - 复制 **anon public key** → 填入 `config.js` 的 `window.SUPABASE_ANON_KEY`

### 2. 上传到 GitHub

```bash
git init
git add .
git commit -m "feat: 待产育儿准备台（Supabase 云端共享版）"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

### 3. 开启 GitHub Pages

1. 仓库页面 → **Settings → Pages**
2. Source 选 **Deploy from a branch**，Branch 选 `main` / `(root)`，保存
3. 一两分钟后访问 `https://<你的用户名>.github.io/<仓库名>/`

也可以改用 Vercel / Netlify，直接导入仓库即可，零配置。

## 使用说明

- **总览**：预产期倒计时（存在本机 localStorage）、今日必买提醒、四阶段进度。
- **清单**：按阶段/优先级/分类/状态筛选，勾选「已备」，已备后可记录已购品牌。
- **预算**：按已备状态自动统计，环形进度 + 分阶段/分类明细。
- **添加**：新物品直接写入 Supabase。
- **实时同步**：基于 Supabase Realtime，任何一台设备改动，其他打开的页面几秒内自动刷新。

## 安全说明

`anon key` 是 Supabase 设计为可公开的密钥，配合行级安全（RLS）使用，可以放心提交到 GitHub。
当前策略是「全家共享」：任何拿到页面链接的人都能读写清单。如果之后想限制为仅家人可用，
可以在 Supabase 开启 Email 登录（Authentication → Providers → Email），并把
`schema.sql` 里策略的 `to anon, authenticated` 改为 `to authenticated`。
