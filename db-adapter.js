/*
 * db-adapter.js — Supabase 数据适配器
 *
 * 把页面的数据层（query / addRecord / updateRecord / deleteRecord /
 * getSchema / onUpdated）映射到 Supabase 的 items 表上。
 * 页面主脚本只认「中文字段名」的行结构，这里负责双向映射，
 * 所以上层 UI 代码不需要任何改动。
 */
(function () {
  'use strict';

  var TABLE = 'items';
  var URL = String(window.SUPABASE_URL || '').trim();
  var KEY = String(window.SUPABASE_ANON_KEY || '').trim();

  var client = null;
  try {
    if (URL && KEY && URL.indexOf('YOUR') === -1 && KEY.indexOf('YOUR') === -1) {
      client = supabase.createClient(URL, KEY);
    }
  } catch (e) {
    console.error('[supabase] 初始化失败:', e);
    client = null;
  }

  /* ---- 字段映射 ---- */
  var COL2ZH = {
    name: '物品名称',
    stage: '阶段',
    category: '分类',
    quantity: '数量',
    recommended_brand: '推荐品牌',
    purchased_brand: '已购品牌',
    priority: '优先级',
    budget: '预算',
    is_done: '已备',
    note: '备注',
    updated_date: '更新日期'
  };
  var ZH2COL = {
    '物品名称': 'name',
    '阶段': 'stage',
    '分类': 'category',
    '数量': 'quantity',
    '推荐品牌': 'recommended_brand',
    '已购品牌': 'purchased_brand',
    '优先级': 'priority',
    '预算': 'budget',
    '已备': 'is_done',
    '备注': 'note',
    '更新日期': 'updated_date'
  };

  function toZH(r) {
    var o = { _id: r.id };
    for (var c in COL2ZH) {
      if (r[c] !== null && r[c] !== undefined) o[COL2ZH[c]] = r[c];
    }
    return o;
  }

  /* properties 形如 { '已备': { checkbox: true }, '预算': { currency: 60 } }，
     取第一个键的值写库 */
  function toCols(properties) {
    var o = {};
    for (var zh in properties) {
      var col = ZH2COL[zh];
      if (!col) continue;
      var v = properties[zh];
      o[col] = (v && typeof v === 'object') ? v[Object.keys(v)[0]] : v;
    }
    return o;
  }

  /* ---- 静态 schema（下拉选项与 supabase/schema.sql 保持一致） ---- */
  var STAGES = ['产前囤货', '待产住院', '产后恢复', '宝宝0-1岁'];
  var PRIOS = ['必买', '建议', '可缓'];
  var CATS = ['妈妈用品', '宝宝用品', '喂养用品', '洗护清洁', '证件资料', '家居装备', '医疗护理', '出行外出'];
  function opts(list) {
    return list.map(function (t) { return { id: t, text: t }; });
  }

  /* ---- 接口实现（与页面主脚本的调用约定一致） ---- */

  function query(args) {
    var start = parseInt(args && args.startCursor, 10) || 0;
    var size = (args && args.pageSize) || 200;
    return client.from(TABLE)
      .select('*')
      .order('created_at', { ascending: true })
      .range(start, start + size - 1)
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = (res.data || []).map(toZH);
        var more = rows.length === size;
        return { results: rows, hasMore: more, nextCursor: more ? String(start + size) : null };
      });
  }

  function addRecord(args) {
    return client.from(TABLE)
      .insert(toCols(args.properties))
      .then(function (res) { if (res.error) throw res.error; return res; });
  }

  function updateRecord(args) {
    return client.from(TABLE)
      .update(toCols(args.properties))
      .eq('id', args.recordId)
      .then(function (res) { if (res.error) throw res.error; return res; });
  }

  function deleteRecord(args) {
    return client.from(TABLE)
      .delete()
      .eq('id', args.recordId)
      .then(function (res) { if (res.error) throw res.error; return res; });
  }

  function getSchema() {
    return Promise.resolve({
      properties: [
        { name: '阶段', type: 'select', config: { options: opts(STAGES) } },
        { name: '分类', type: 'select', config: { options: opts(CATS) } },
        { name: '优先级', type: 'select', config: { options: opts(PRIOS) } }
      ]
    });
  }

  /* 实时同步：监听表变更，任何人（任何设备）改动后其他端自动刷新 */
  var cbs = [];
  var subscribed = false;
  function onUpdated(cb) {
    if (typeof cb !== 'function') return;
    cbs.push(cb);
    if (subscribed) return;
    subscribed = true;
    client.channel(TABLE + '-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, function () {
        var payload = { databaseIds: [TABLE] };
        cbs.forEach(function (f) {
          try { f(payload); } catch (e) { console.error(e); }
        });
      })
      .subscribe(function (status) {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[supabase] 实时通道异常:', status);
        }
      });
  }

  window.WBDB = client
    ? { query: query, addRecord: addRecord, updateRecord: updateRecord, deleteRecord: deleteRecord, getSchema: getSchema, onUpdated: onUpdated }
    : null;
})();
