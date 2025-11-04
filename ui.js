function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function createUI(bus, game) {
  const qs = s => document.querySelector(s);
  const petCard = qs('#petCard');
  const petEmoji = qs('#petEmoji');
  const petName = qs('#petName');
  const coins = qs('#coins');
  const rate = qs('#rate');
  const barHunger = qs('#barHunger');
  const rateHunger = qs('#rateHunger');
  const barHappy = qs('#barHappy');
  const rateHappy = qs('#rateHappy');
  const barEnergy = qs('#barEnergy');
  const rateEnergy = qs('#rateEnergy');
  const barClean = qs('#barClean');
  const rateClean = qs('#rateClean');
  const tapBtn = qs('#tapBtn');
  const tapValue = qs('#tapValue');
  const feedBtn = qs('#feedBtn');
  const playBtn = qs('#playBtn');
  const napBtn = qs('#napBtn');
  const cleanBtn = qs('#cleanBtn');
  const shopList = qs('#shopList');
  const level = qs('#level');
  const coinsEarned = qs('#coinsEarned');
  const coinsCurrent = qs('#coinsCurrent');
  const passive = qs('#passive');
  const clickPower = qs('#clickPower');
  const timePlayed = qs('#timePlayed');
  const lastOnline = qs('#lastOnline');
  const saveBtn = qs('#saveBtn');
  const resetBtn = qs('#resetBtn');
  const renameBtn = qs('#renameBtn');
  const renameDialog = qs('#renameDialog');
  const nameInput = qs('#nameInput');
  const renameConfirm = qs('#renameConfirm');

  // Tabs
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = {
    care: qs('#tab-care'),
    upgrades: qs('#tab-upgrades'),
    stats: qs('#tab-stats'),
  };
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(tt => tt.classList.toggle('active', tt === t));
      Object.entries(panels).forEach(([key, el]) => {
        const active = t.dataset.tab === key;
        el.classList.toggle('active', active);
        el.setAttribute('aria-hidden', active ? 'false' : 'true');
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    });
  });

  // Actions
  tapBtn.addEventListener('click', () => game.tap());
  feedBtn.addEventListener('click', () => game.act('feed'));
  playBtn.addEventListener('click', () => game.act('play'));
  napBtn.addEventListener('click', () => game.act('nap'));
  cleanBtn.addEventListener('click', () => game.act('clean'));

  // Pet rename
  renameBtn.addEventListener('click', () => {
    nameInput.value = petName.textContent || '';
    renameDialog.showModal();
    nameInput.focus();
  });
  renameConfirm.addEventListener('click', () => {
    game.rename(nameInput.value.trim());
  });

  // Save / Reset
  saveBtn.addEventListener('click', () => window.dispatchEvent(new Event('beforeunload')));
  resetBtn.addEventListener('click', () => {
    if (confirm('Adopt a new pet? This resets progress (keeps name).')) game.reset();
  });

  // Shop render
  function renderShop(shop) {
    shopList.innerHTML = '';
    shop.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="row">
          <div>
            <div><strong>${item.name}</strong> <span class="badge">x${item.owned}</span></div>
            <div class="desc">${item.desc}</div>
          </div>
          <div style="text-align:right;">
            <div class="price">🪙 ${item.price}</div>
            <button class="secondary-btn buy" data-id="${item.id}" type="button">Buy</button>
          </div>
        </div>
      `;
      shopList.appendChild(li);
    });
  }
  // Delegate buy clicks to the list (robust across re-renders)
  shopList.addEventListener('click', (e) => {
    const btn = e.target.closest('.buy');
    if (!btn) return;
    const id = btn.dataset.id;
    if (id) game.buy(id);
  });

  // Animations
  bus.on('tap', gain => {
    petCard.classList.add('tap');
    setTimeout(() => petCard.classList.remove('tap'), 120);
    floatingText(`+${gain}`, petEmoji);
  });
  bus.on('toast', text => floatingText(text, petCard));

  function floatingText(text, anchor) {
    const span = document.createElement('span');
    Object.assign(span.style, {
      position: 'absolute',
      pointerEvents: 'none',
      left: '50%',
      transform: 'translateX(-50%)',
      top: `${anchor.getBoundingClientRect().top + window.scrollY - 6}px`,
      fontWeight: '700',
      color: '#111',
      transition: 'all 700ms ease',
      opacity: '1',
    });
    span.textContent = text;
    document.body.appendChild(span);
    requestAnimationFrame(() => {
      span.style.top = `${parseFloat(span.style.top) - 36}px`;
      span.style.opacity = '0';
    });
    setTimeout(() => span.remove(), 720);
  }

  function moodImage(stats) {
    const avg = (stats.hunger + stats.happy + stats.energy + stats.clean) / 4;
    if (avg > 0.8) return 'pet_happy.png';
    if (avg > 0.6) return 'pet_smile.png';
    if (avg > 0.4) return 'pet_neutral.png';
    if (avg > 0.2) return 'pet_sad.png';
    return 'pet_cry.png';
  }

  // Initial render
  bus.on('render', snap => {
    coins.textContent = Math.floor(snap.coinsPrecise);
    rate.textContent = `+${(snap.passive).toFixed(1)}/s`;
    tapValue.textContent = snap.clickPower;
    petName.textContent = snap.petName;
    petEmoji.src = moodImage(snap.stats);
    petEmoji.alt = `Pet mood`;

    barHunger.style.width = `${snap.stats.hunger * 100}%`;
    barHappy.style.width = `${snap.stats.happy * 100}%`;
    barEnergy.style.width = `${snap.stats.energy * 100}%`;
    barClean.style.width = `${snap.stats.clean * 100}%`;

    const decay = 0.03;
    const fmt = v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}/s`;
    rateHunger.textContent = fmt(snap.rates.hunger - decay);
    rateHappy.textContent  = fmt(snap.rates.happy  - decay);
    rateEnergy.textContent = fmt(snap.rates.energy - decay);
    rateClean.textContent  = fmt(snap.rates.clean  - decay);

    level.textContent = snap.level;
    coinsCurrent.textContent = Math.floor(snap.coins);
    coinsEarned.textContent = Math.floor(snap.coinsEarned);
    passive.textContent = snap.passive.toFixed(1);
    clickPower.textContent = snap.clickPower;
    timePlayed.textContent = fmtTime(snap.timePlayedMs);
    lastOnline.textContent = new Date(snap.lastTick).toLocaleTimeString();

    renderShop(snap.shop);
  });

  // first paint
  bus.emit('render', {
    petName: game.state.petName,
    coinsPrecise: game.state.coins,
    passive: game.state.passive,
    clickPower: game.state.clickPower,
    stats: game.state.stats,
    rates: game.state.rates,
    level: game.state.level,
    timePlayedMs: game.state.timePlayedMs,
    lastTick: game.state.lastTick,
    shop: [],
  });

  return {};
}