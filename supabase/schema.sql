-- schema.sql — 待产＆育儿准备台 数据表
-- 在 Supabase Dashboard → SQL Editor 中执行一次即可

create extension if not exists "pgcrypto";

create table if not exists public.items (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  name              text not null,                 -- 物品名称
  stage             text,                          -- 阶段：产前囤货 / 待产住院 / 产后恢复 / 宝宝0-1岁
  category          text,                          -- 分类：妈妈用品 / 宝宝用品 / 喂养用品 / 洗护清洁 / 证件资料 / 家居装备 / 医疗护理 / 出行外出
  quantity          text,                          -- 数量
  recommended_brand text,                          -- 推荐品牌
  purchased_brand   text,                          -- 已购品牌
  priority          text,                          -- 优先级：必买 / 建议 / 可缓
  budget            numeric(12,2) default 0,       -- 预算（元）
  is_done           boolean not null default false,-- 已备
  note              text,                          -- 备注
  updated_date      date                           -- 更新日期
);

-- 行级安全：全家共享模式，任何拿到 anon key（即拿到网页链接）的人可读写。
-- 如需收紧，可开启 Supabase Auth 后把 to anon, authenticated 改成 to authenticated。
alter table public.items enable row level security;

drop policy if exists "items_public_read"  on public.items;
drop policy if exists "items_public_write" on public.items;

create policy "items_public_read"  on public.items
  for select to anon, authenticated using (true);
create policy "items_public_write" on public.items
  for insert to anon, authenticated with check (true);
create policy "items_public_update" on public.items
  for update to anon, authenticated using (true) with check (true);
create policy "items_public_delete" on public.items
  for delete to anon, authenticated using (true);

-- 打开实时推送（多端自动同步）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;
end $$;
