/*
 * reorg-stages.js — 把明显提前太久购买的可缓/后期用品，从「产前囤货」迁移到更合适的阶段。
 * 凭证从项目根目录的 config.js 读取（不写死），只需在本机用 node 跑一次即可：
 *   node scripts/reorg-stages.js
 * 仅更新 stage 字段，不会触碰 is_done / 预算 / 已购品牌等其它数据。
 */
const fs = require('fs');
const path = require('path');

const cfgPath = path.join(__dirname, '..', 'config.js');
const cfg = fs.readFileSync(cfgPath, 'utf8');
const URL = (cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/) || [])[1];
const KEY = (cfg.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/) || [])[1];

if (!URL || !KEY) {
  console.error('未能从 config.js 解析到 SUPABASE_URL / SUPABASE_ANON_KEY');
  process.exit(1);
}

// [物品名称, 目标阶段]
const MOVES = [
  ['婴儿车', '宝宝0-1岁'],
  ['婴儿安全座椅', '宝宝0-1岁'],
  ['尿布台/护理台', '产后恢复'],
  ['硅胶碗勺', '宝宝0-1岁']
];

const H = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };

async function findRow(name) {
  const r = await fetch(`${URL}/rest/v1/items?name=eq.${encodeURIComponent(name)}&select=id,name,stage`, { headers: H });
  if (!r.ok) throw new Error('查询失败 ' + r.status + ' ' + (await r.text()));
  return r.json();
}

async function patch(id, stage) {
  const r = await fetch(`${URL}/rest/v1/items?id=eq.${id}`, {
    method: 'PATCH',
    headers: Object.assign({ 'Prefer': 'return=representation' }, H),
    body: JSON.stringify({ stage })
  });
  if (!r.ok) throw new Error('更新失败 ' + r.status + ' ' + (await r.text()));
  return r.json();
}

(async () => {
  for (const [name, stage] of MOVES) {
    try {
      const rows = await findRow(name);
      if (!rows || !rows.length) { console.log('⚠ 未找到：', name); continue; }
      if (rows.length > 1) { console.log('⚠ 名称重复，已跳过（请手动处理）：', name, '×' + rows.length); continue; }
      const row = rows[0];
      if (row.stage === stage) { console.log('· 已是最新，跳过：', name); continue; }
      const res = await patch(row.id, stage);
      console.log('✓ 已更新：', name, '→', stage, '(', (res[0] && res[0].stage) || '', ')');
    } catch (e) {
      console.log('✗ 处理失败：', name, '-', e.message);
    }
  }
  console.log('完成。');
})();
