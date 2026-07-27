/* ============================================================
   便當菜單資料（茶宗風健康餐盒．真實菜單）
   熱量 / 蛋白質 = 菜單標示值（步驟2 主餐原始餐盒）
   veg（蔬菜比例 0~1）= demo 估計值，用於推薦計算，未來可換真實資料
   ============================================================ */
const MENU = [
  { id: 'chicken',  name: '舒肥大肌雞胸肉', en: 'Sous-vided Tender Chicken Rice', price: 130, kcal: 573, protein: 38.5, veg: 0.50, icon: '🍗', tags: ['雞肉'] },
  { id: 'beef',     name: '算來算去測涮牛', en: 'Water-boiled Tender Beef Rice',   price: 130, kcal: 763, protein: 34.9, veg: 0.45, icon: '🥩', tags: ['牛肉'] },
  { id: 'pork',     name: '台灣豬就是讚啦', en: 'Water-boiled Tender Pork Rice',   price: 120, kcal: 591, protein: 34.8, veg: 0.45, icon: '🥓', tags: ['豬肉'] },
  { id: 'fish',     name: '如魚得水煮魚',   en: 'Water-boiled Tender Fish Rice',   price: 120, kcal: 576, protein: 43.5, veg: 0.50, icon: '🐟', tags: ['海鮮'] },
  { id: 'salmon',   name: '力爭上游鮮鮭魚', en: 'Water-boiled Tender Salmon Rice', price: 170, kcal: 597, protein: 35.1, veg: 0.45, icon: '🐠', tags: ['海鮮'] },
  { id: 'noodle',   name: '浩克小肌雞胸麵', en: 'Sous-vided Tender Chicken Noodle', price: 130, kcal: 540, protein: 33.9, veg: 0.25, icon: '🍜', tags: ['雞肉', '含麵食'] },
  { id: 'veggie',   name: '清新脫俗素餐盒', en: 'Lots Of Vegetables With Rice',    price: 89,  kcal: 465, protein: 21.4, veg: 0.90, icon: '🥗', tags: ['素食'] },
  { id: 'soup',     name: '養生香菇雞鍋',   en: 'Shiitake Mushroom Chicken Soup',  price: 140, kcal: 583, protein: 32.0, veg: 0.50, icon: '🍲', tags: ['雞肉', '湯品'] }
];

/* 步驟1：主食客製化（單選，會改變熱量/蛋白/價格）— delta 為 demo 估計值 */
const BASE_OPTIONS = [
  { id: 'rice',   label: '白飯（預設）',   price: 0,  dKcal: 0,    dProtein: 0 },
  { id: 'veg',    label: '飯換菜',         price: 10, dKcal: -160, dProtein: -3 },
  { id: 'sweet',  label: '飯換地瓜',       price: 10, dKcal: -60,  dProtein: -1 },
  { id: 'vnoodle',label: '飯換蔬菜麵',     price: 20, dKcal: -40,  dProtein: 2 }
];

/* 步驟3：調味（單選）*/
const SAUCE_OPTIONS = [
  { id: 'salt',   label: '椒鹽系列（免費）',       price: 0,  dKcal: 0,   dProtein: 0 },
  { id: 'sauce',  label: '醬料類 胡麻/泰醬/油蔥',  price: 10, dKcal: 90,  dProtein: 1 },
  { id: 'kimchi', label: '歐巴韓式泡菜',           price: 15, dKcal: 30,  dProtein: 1 }
];

/* 加購小品（可複選）*/
const ADDON_OPTIONS = [
  { id: 'egg',    label: '水煮蛋',     price: 15, dKcal: 70,  dProtein: 7 },
  { id: 'sweet2', label: '香甜地瓜',   price: 30, dKcal: 120, dProtein: 2 },
  { id: 'veg2',   label: '季節蔬菜',   price: 30, dKcal: 40,  dProtein: 2 },
  { id: 'kim2',   label: '韓式泡菜',   price: 30, dKcal: 30,  dProtein: 1 },
  { id: 'rice2',  label: '健康紫米飯', price: 20, dKcal: 150, dProtein: 3 }
];

/* ---- 推薦引擎（規則式 + 加權評分，對應提案第五節）---- */
const _maxP = Math.max(...MENU.map(m => m.protein));
const _maxK = Math.max(...MENU.map(m => m.kcal));
const _minK = Math.min(...MENU.map(m => m.kcal));

function healthScore(m, goal) {
  const protN = m.protein / _maxP;                 // 蛋白質正規化 0~1
  const calN  = (m.kcal - _minK) / (_maxK - _minK); // 熱量正規化 0~1
  const lowCal = 1 - calN;                          // 熱量越低越高分
  const veg = m.veg;
  if (goal === 'cut')   return 0.40 * lowCal + 0.45 * protN + 0.15 * veg; // 減脂：低熱量+高蛋白
  if (goal === 'bulk')  return 0.60 * protN + 0.25 * calN  + 0.15 * veg;  // 增肌：高蛋白+足夠熱量
  return 0.40 * protN + 0.30 * lowCal + 0.30 * veg;                       // 維持：提案第五節健康分數
}

/* 產生推薦理由（可攤開講給評審聽）*/
function reasonFor(m, goal) {
  const parts = [];
  if (m.protein >= 38)      parts.push(`高蛋白（${m.protein}g）`);
  else if (m.protein >= 30) parts.push(`蛋白質充足（${m.protein}g）`);
  else                      parts.push(`蛋白質 ${m.protein}g`);
  if (m.kcal <= 500)        parts.push(`低熱量（${m.kcal}kcal）`);
  else if (m.kcal <= 600)   parts.push(`熱量適中（${m.kcal}kcal）`);
  else                      parts.push(`熱量較高（${m.kcal}kcal，適合增肌補能）`);
  if (m.veg >= 0.8)         parts.push('大量蔬菜、飽足感佳');
  else if (m.veg >= 0.45)   parts.push('搭配蔬菜增加飽足感');
  const goalMap = { cut: '減脂', bulk: '增肌', maintain: '維持' };
  return `${m.name} — ${parts.join('、')}，符合你的${goalMap[goal]}目標。`;
}
