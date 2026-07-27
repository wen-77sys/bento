/* ===== 點餐端邏輯 ===== */
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const state = {
  anonId: '',
  mode: null,       // health / free / random
  goal: null,       // cut / bulk / maintain
  filters: { ex: new Set(), vegOnly: false },
  meal: null,       // 選中的便當
  base: BASE_OPTIONS[0],
  sauce: SAUCE_OPTIONS[0],
  addons: new Set()
};

/* --- 匿名 ID --- */
function genId() {
  return 'BENTO-' + Math.floor(10000 + Math.random() * 89999);
}
state.anonId = genId();
$('#anonId').textContent = state.anonId;

/* --- 供貨中的便當（後台可下架）--- */
function offlineSet() {
  try { return new Set(JSON.parse(localStorage.getItem('bento_offline') || '[]')); }
  catch { return new Set(); }
}
function availableMenu() {
  const off = offlineSet();
  return MENU.filter(m => !off.has(m.id));
}
function passFilter(m) {
  if (state.filters.vegOnly && !m.tags.includes('素食')) return false;
  for (const ex of state.filters.ex) if (m.tags.includes(ex)) return false;
  return true;
}

/* --- 選模式 --- */
$$('.mode-card').forEach(c => c.addEventListener('click', () => {
  $$('.mode-card').forEach(x => x.classList.remove('active'));
  c.classList.add('active');
  state.mode = c.dataset.mode;
  state.meal = null;
  hide('#customPanel'); hide('#liveBar');
  if (state.mode === 'free') {
    hide('#goalPanel'); hide('#recoResult');
    show('#listResult'); renderList();
  } else if (state.mode === 'health') {
    show('#goalPanel'); hide('#listResult'); hide('#recoResult');
  } else if (state.mode === 'random') {
    hide('#goalPanel'); hide('#listResult');
    doRandom();
  }
}));

/* --- 目標 chips --- */
$$('#goalChips .chip').forEach(c => c.addEventListener('click', () => {
  $$('#goalChips .chip').forEach(x => x.classList.remove('active'));
  c.classList.add('active');
  state.goal = c.dataset.goal;
  doRecommend();
}));
$$('#filterChips .chip').forEach(c => c.addEventListener('click', () => {
  c.classList.toggle('active');
  if (c.dataset.veg) state.filters.vegOnly = c.classList.contains('active');
  else {
    const ex = c.dataset.ex;
    if (c.classList.contains('active')) state.filters.ex.add(ex);
    else state.filters.ex.delete(ex);
  }
  if (state.goal) doRecommend();          // 重新推薦
  if (state.mode === 'free') renderList(); // 重新過濾清單
}));

/* --- 健康推薦 --- */
function doRecommend() {
  if (!state.goal) return;
  const pool = availableMenu().filter(passFilter);
  show('#recoResult');
  if (pool.length === 0) {
    $('#recoBox').innerHTML = `<div class="reco-box"><p>目前沒有符合你飲食限制的便當，請調整條件。</p></div>`;
    return;
  }
  const ranked = pool.map(m => ({ m, s: healthScore(m, state.goal) }))
                     .sort((a, b) => b.s - a.s);
  const top = ranked[0].m;
  const runnerUp = ranked.slice(1, 3).map(r => r.m);
  const f = state.goal === 'cut'
    ? '減脂：0.40×(低熱量) + 0.45×蛋白質 + 0.15×蔬菜'
    : state.goal === 'bulk'
    ? '增肌：0.60×蛋白質 + 0.25×熱量 + 0.15×蔬菜'
    : '維持：0.40×蛋白質 + 0.30×(低熱量) + 0.30×蔬菜（提案第五節健康分數）';
  $('#recoBox').innerHTML = `
    <div class="reco-box">
      <div style="font-size:1.6rem">${top.icon} <b style="font-size:1.1rem">${top.name}</b>
        <span style="float:right;font-weight:800;color:var(--teal-dark)">$${top.price}</span></div>
      <div class="nutri" style="display:flex;gap:10px;margin-top:6px">
        <span class="badge">${top.kcal} kcal</span>
        <span class="badge">蛋白質 ${top.protein}g</span>
      </div>
      <p class="why">💡 ${reasonFor(top, state.goal)}</p>
      <div class="formula">評分公式 ｜ ${f}<br>推薦分數：${(ranked[0].s * 100).toFixed(0)} 分（分數越高越符合目標）</div>
      <button class="btn block" onclick="pickMeal('${top.id}')">選這個並客製化 →</button>
    </div>
    ${runnerUp.length ? `<p class="muted" style="margin-top:10px">其他推薦：${runnerUp.map(m => `${m.icon}${m.name}`).join('、')}</p>` : ''}
  `;
}

/* --- 隨機推薦（健康分數加權隨機）--- */
function doRandom() {
  const pool = availableMenu().filter(passFilter);
  show('#recoResult');
  if (pool.length === 0) { $('#recoBox').innerHTML = `<div class="reco-box"><p>目前無可供餐點。</p></div>`; return; }
  const weights = pool.map(m => Math.pow(healthScore(m, 'maintain'), 2)); // 分數越高機率越高
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum, pick = pool[0];
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { pick = pool[i]; break; } }
  $('#recoBox').innerHTML = `
    <div class="reco-box">
      <p class="muted">🎲 幫你抽好了！（健康分數越高，被抽中機率越高）</p>
      <div style="font-size:1.6rem">${pick.icon} <b style="font-size:1.1rem">${pick.name}</b>
        <span style="float:right;font-weight:800;color:var(--teal-dark)">$${pick.price}</span></div>
      <div class="nutri" style="display:flex;gap:10px;margin-top:6px">
        <span class="badge">${pick.kcal} kcal</span>
        <span class="badge">蛋白質 ${pick.protein}g</span>
      </div>
      <p class="why">💡 ${reasonFor(pick, 'maintain')}</p>
      <button class="btn block" onclick="pickMeal('${pick.id}')">就吃這個並客製化 →</button>
      <button class="btn ghost block" onclick="doRandom()">再抽一次 🎲</button>
    </div>`;
}

/* --- 自由點餐清單 --- */
function renderList() {
  const pool = availableMenu().filter(passFilter);
  $('#mealGrid').innerHTML = pool.map(m => `
    <div class="meal" onclick="pickMeal('${m.id}')">
      <div class="price">$${m.price}</div>
      <div class="thumb">${m.icon}</div>
      <div class="mtitle">${m.name}</div>
      <div class="men">${m.en}</div>
      <div class="nutri">
        <span class="badge">${m.kcal} kcal</span>
        <span class="badge">蛋白質 ${m.protein}g</span>
      </div>
      <div style="margin-top:6px">${m.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
    </div>`).join('');
}

/* --- 選定便當 → 客製化 --- */
function pickMeal(id) {
  state.meal = MENU.find(m => m.id === id);
  state.base = BASE_OPTIONS[0];
  state.sauce = SAUCE_OPTIONS[0];
  state.addons = new Set();
  renderCustom();
  show('#customPanel'); show('#liveBar');
  $('#customPanel').scrollIntoView({ behavior: 'smooth' });
}

function renderCustom() {
  const m = state.meal;
  const radio = (name, opts, sel, extra) => opts.map(o => `
    <label class="opt">
      <input type="radio" name="${name}" value="${o.id}" ${o.id === sel.id ? 'checked' : ''}
        onchange="setOpt('${name}','${o.id}')">
      ${o.label}${o.price ? ` <span class="muted">+$${o.price}</span>` : ''}
      ${extra ? extra(o) : ''}
    </label>`).join('');
  const nutriHint = (o) => (o.dKcal || o.dProtein)
    ? ` <span class="muted">(${o.dKcal >= 0 ? '+' : ''}${o.dKcal}kcal，蛋白${o.dProtein >= 0 ? '+' : ''}${o.dProtein}g)</span>` : '';
  $('#customBody').innerHTML = `
    <h3>${m.icon} ${m.name} <span style="font-weight:400;color:var(--gray);font-size:.85rem">原始 ${m.kcal}kcal · 蛋白${m.protein}g · $${m.price}</span></h3>
    <div class="opt-group"><div class="lbl">步驟1｜主食客製化</div>
      ${radio('base', BASE_OPTIONS, state.base, nutriHint)}</div>
    <div class="opt-group"><div class="lbl">步驟3｜調味</div>
      ${radio('sauce', SAUCE_OPTIONS, state.sauce, nutriHint)}</div>
    <div class="opt-group"><div class="lbl">加購小品（可複選）</div>
      ${ADDON_OPTIONS.map(o => `
        <label class="opt">
          <input type="checkbox" value="${o.id}" ${state.addons.has(o.id) ? 'checked' : ''}
            onchange="toggleAddon('${o.id}')">
          ${o.label} <span class="muted">+$${o.price}（+${o.dKcal}kcal，蛋白+${o.dProtein}g）</span>
        </label>`).join('')}
    </div>
    <p class="muted">↓ 客製後的營養／價格已即時重算（紙本菜單只印原始那一盒，這正是系統的優勢）</p>
  `;
  recompute();
}

function setOpt(name, id) {
  if (name === 'base')  state.base  = BASE_OPTIONS.find(o => o.id === id);
  if (name === 'sauce') state.sauce = SAUCE_OPTIONS.find(o => o.id === id);
  recompute();
}
function toggleAddon(id) {
  if (state.addons.has(id)) state.addons.delete(id); else state.addons.add(id);
  recompute();
}

/* --- 即時重算（亮點）--- */
function currentTotals() {
  const m = state.meal;
  let kcal = m.kcal, protein = m.protein, price = m.price;
  [state.base, state.sauce].forEach(o => { kcal += o.dKcal; protein += o.dProtein; price += o.price; });
  state.addons.forEach(id => {
    const o = ADDON_OPTIONS.find(a => a.id === id);
    kcal += o.dKcal; protein += o.dProtein; price += o.price;
  });
  return { kcal: Math.max(0, Math.round(kcal)), protein: Math.max(0, +protein.toFixed(1)), price };
}
function recompute() {
  const t = currentTotals();
  const setFlash = (sel, val) => {
    const el = $(sel);
    if (el.textContent !== String(val)) { el.textContent = val; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  };
  setFlash('#lvKcal', t.kcal);
  setFlash('#lvProtein', t.protein);
  setFlash('#lvPrice', '$' + t.price);
}

/* --- 送出訂單 → 存 localStorage 供後台統計 --- */
$('#orderBtn').addEventListener('click', () => {
  if (!state.meal) return;
  const t = currentTotals();
  const order = {
    anonId: state.anonId, mealId: state.meal.id, mealName: state.meal.name,
    goal: state.goal || (state.mode === 'random' ? 'random' : 'free'),
    kcal: t.kcal, protein: t.protein, price: t.price, time: Date.now()
  };
  const orders = JSON.parse(localStorage.getItem('bento_orders') || '[]');
  orders.push(order);
  localStorage.setItem('bento_orders', JSON.stringify(orders));
  toast(`✅ 訂單已送出！${state.meal.name}　$${t.price}`);
  // 換一個新的匿名 session（模擬翻桌）
  state.anonId = genId(); $('#anonId').textContent = state.anonId;
  hide('#customPanel'); hide('#liveBar');
  $$('.mode-card').forEach(x => x.classList.remove('active'));
  state.mode = null; state.meal = null;
  hide('#goalPanel'); hide('#recoResult'); hide('#listResult');
});

/* --- 小工具 --- */
function show(s) { $(s).classList.remove('hidden'); }
function hide(s) { $(s).classList.add('hidden'); }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
