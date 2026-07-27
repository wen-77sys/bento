/* ===== 業者後台邏輯 ===== */
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function getOrders()  { try { return JSON.parse(localStorage.getItem('bento_orders')  || '[]'); } catch { return []; } }
function getOffline() { try { return new Set(JSON.parse(localStorage.getItem('bento_offline') || '[]')); } catch { return new Set(); } }
function setOffline(s){ localStorage.setItem('bento_offline', JSON.stringify([...s])); }

function render() {
  const orders = getOrders();
  const n = orders.length;
  const revenue = orders.reduce((a, o) => a + o.price, 0);
  const avg = n ? Math.round(revenue / n) : 0;
  const avgKcal = n ? Math.round(orders.reduce((a, o) => a + o.kcal, 0) / n) : 0;

  /* 總覽卡 */
  $('#statGrid').innerHTML = `
    <div class="stat-tile"><b>${n}</b><span>總訂單數</span></div>
    <div class="stat-tile"><b>$${revenue}</b><span>總營業額</span></div>
    <div class="stat-tile"><b>$${avg}</b><span>平均客單價</span></div>
    <div class="stat-tile"><b>${avgKcal}</b><span>平均熱量 kcal</span></div>`;

  /* 熱門便當排行 */
  const count = {};
  MENU.forEach(m => count[m.id] = 0);
  orders.forEach(o => { if (count[o.mealId] != null) count[o.mealId]++; });
  const ranked = MENU.map(m => ({ m, c: count[m.id] })).sort((a, b) => b.c - a.c);
  const maxC = Math.max(1, ...ranked.map(r => r.c));
  $('#rankChart').innerHTML = ranked.map(r => `
    <div class="bar-row">
      <div class="bl">${r.m.icon} ${r.m.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(r.c / maxC * 100).toFixed(0)}%"></div></div>
      <div class="bv">${r.c}</div>
    </div>`).join('') || '<p class="muted">尚無訂單資料。</p>';

  /* 顧客目標分佈 */
  const goals = { cut: 0, bulk: 0, maintain: 0, random: 0, free: 0 };
  orders.forEach(o => { if (goals[o.goal] != null) goals[o.goal]++; });
  const gLabel = { cut: '減脂', bulk: '增肌', maintain: '維持健康', random: '隨機推薦', free: '自由點餐' };
  const gMax = Math.max(1, ...Object.values(goals));
  $('#goalChart').innerHTML = Object.keys(goals).map(k => `
    <div class="bar-row">
      <div class="bl">${gLabel[k]}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(goals[k] / gMax * 100).toFixed(0)}%"></div></div>
      <div class="bv">${n ? (goals[k] / n * 100).toFixed(0) + '%' : '0%'}</div>
    </div>`).join('');

  /* 上架管理表 */
  const off = getOffline();
  $('#menuTable tbody').innerHTML = MENU.map(m => {
    const isOn = !off.has(m.id);
    return `<tr>
      <td>${m.icon} ${m.name}</td>
      <td>$${m.price}</td>
      <td>${m.kcal} kcal</td>
      <td>${m.protein} g</td>
      <td>${count[m.id]} 份</td>
      <td><span class="switch ${isOn ? 'on' : 'off'}" onclick="toggleMeal('${m.id}')">
        ${isOn ? '● 上架中' : '○ 已下架'}</span></td>
    </tr>`;
  }).join('');
}

function toggleMeal(id) {
  const off = getOffline();
  if (off.has(id)) off.delete(id); else off.add(id);
  setOffline(off);
  render();
}

/* demo：產生示範訂單 */
$('#seedBtn').addEventListener('click', () => {
  const goalPool = ['cut', 'cut', 'bulk', 'maintain', 'random', 'free'];
  const orders = getOrders();
  for (let i = 0; i < 18; i++) {
    const m = MENU[Math.floor(Math.random() * MENU.length)];
    // 熱門偏向雞胸與魚
    const pick = Math.random() < 0.4 ? MENU[Math.floor(Math.random() * 4)] : m;
    orders.push({
      anonId: 'BENTO-' + Math.floor(10000 + Math.random() * 89999),
      mealId: pick.id, mealName: pick.name,
      goal: goalPool[Math.floor(Math.random() * goalPool.length)],
      kcal: pick.kcal + Math.floor((Math.random() - .5) * 200),
      protein: pick.protein, price: pick.price + (Math.random() < .5 ? 0 : 15),
      time: Date.now() - Math.floor(Math.random() * 6 * 3600e3)
    });
  }
  localStorage.setItem('bento_orders', JSON.stringify(orders));
  toast('已產生 18 筆示範訂單'); render();
});

$('#clearBtn').addEventListener('click', () => {
  localStorage.removeItem('bento_orders');
  toast('訂單資料已清空'); render();
});

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

render();
