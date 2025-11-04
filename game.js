const clamp01 = v => Math.max(0, Math.min(1, v));

const SHOP_ITEMS = [
  { id: 'autoFeeder', name: 'Auto Feeder', desc: '+0.3 hunger/s restore', base: 50, inc: 1.25, effect: s => s.rates.hunger += 0.3 },
  { id: 'toyDrone', name: 'Toy Drone', desc: '+0.3 happiness/s', base: 50, inc: 1.25, effect: s => s.rates.happy += 0.3 },
  { id: 'solarBed', name: 'Solar Bed', desc: '+0.3 energy/s', base: 50, inc: 1.25, effect: s => s.rates.energy += 0.3 },
  { id: 'roomba', name: 'Roomba', desc: '+0.3 cleanliness/s', base: 50, inc: 1.25, effect: s => s.rates.clean += 0.3 },
  { id: 'click1', name: 'Finger Training', desc: '+1 coin per tap', base: 20, inc: 1.3, effect: s => s.clickPower += 1 },
  { id: 'passive1', name: 'Piggy Bank', desc: '+0.5 coins/s', base: 40, inc: 1.35, effect: s => s.passive += 0.5 },
];

export function createGame(bus, persisted) {
  const now = Date.now();
  const state = persisted ?? {
    petName: 'Sprout',
    coins: 0,
    coinsEarned: 0,
    passive: 0,
    clickPower: 1,
    stats: { hunger: 0.7, happy: 0.7, energy: 0.7, clean: 0.7 },
    rates: { hunger: 0, happy: 0, energy: 0, clean: 0 },
    level: 1,
    timePlayedMs: 0,
    lastTick: now,
    lastSave: now,
    inventory: SHOP_ITEMS.reduce((acc, it) => (acc[it.id] = 0, acc), {}),
  };

  // Offline progress
  if (persisted) {
    const dt = Math.min(1000 * 60 * 60 * 8, now - (persisted.lastTick ?? now)); // cap 8h
    simulate(state, dt);
  }

  function simulate(s, ms) {
    const seconds = ms / 1000;
    // Economy
    const income = s.passive * seconds;
    s.coins += income;
    s.coinsEarned += income;
    // Needs drift
    const decay = 0.03 * seconds; // natural decay
    s.stats.hunger = clamp01(s.stats.hunger + (s.rates.hunger * seconds) - decay);
    s.stats.happy  = clamp01(s.stats.happy  + (s.rates.happy  * seconds) - decay);
    s.stats.energy = clamp01(s.stats.energy + (s.rates.energy * seconds) - decay);
    s.stats.clean  = clamp01(s.stats.clean  + (s.rates.clean  * seconds) - decay);
    // Level from average care
    const careAvg = (s.stats.hunger + s.stats.happy + s.stats.energy + s.stats.clean) / 4;
    s.level = Math.max(1, Math.floor(careAvg * 10));
    s.timePlayedMs += ms;
  }

  function update() {
    const t = Date.now();
    const dt = t - state.lastTick;
    if (dt <= 0) return;
    simulate(state, dt);
    state.lastTick = t;
    bus.emit('render', snapshot());
  }

  function tap() {
    const gain = state.clickPower;
    state.coins += gain;
    state.coinsEarned += gain;
    bus.emit('tap', gain);
  }

  function act(type) {
    const s = state.stats;
    if (type === 'feed') s.hunger = clamp01(s.hunger + 0.25);
    if (type === 'play') s.happy  = clamp01(s.happy  + 0.25);
    if (type === 'nap')  s.energy = clamp01(s.energy + 0.25);
    if (type === 'clean') s.clean = clamp01(s.clean + 0.3);
    bus.emit('render', snapshot());
  }

  function buy(id) {
    const def = SHOP_ITEMS.find(i => i.id === id);
    if (!def) return;
    const owned = state.inventory[id] ?? 0;
    const price = Math.floor(def.base * Math.pow(def.inc, owned));
    if (state.coins < price) return;
    state.coins -= price;
    state.inventory[id] = owned + 1;
    def.effect(state);
    if (id.startsWith('passive')) bus.emit('toast', '+Passive');
    if (id.startsWith('click')) bus.emit('toast', '+Tap');
    bus.emit('render', snapshot());
  }

  function rename(newName) {
    state.petName = newName.slice(0, 16) || 'Sprout';
    bus.emit('render', snapshot());
  }

  function reset() {
    const keep = state.petName;
    const fresh = createGame(bus, null).state;
    fresh.petName = keep;
    Object.assign(state, fresh);
    bus.emit('render', snapshot());
  }

  function getShop() {
    return SHOP_ITEMS.map(def => {
      const owned = state.inventory[def.id] ?? 0;
      const price = Math.floor(def.base * Math.pow(def.inc, owned));
      return { ...def, price, owned };
    });
  }

  function snapshot() {
    return {
      petName: state.petName,
      coins: Math.floor(state.coins),
      coinsPrecise: state.coins,
      coinsEarned: Math.floor(state.coinsEarned),
      passive: state.passive,
      clickPower: state.clickPower,
      stats: { ...state.stats },
      rates: { ...state.rates },
      level: state.level,
      timePlayedMs: state.timePlayedMs,
      lastTick: state.lastTick,
      shop: getShop(),
    };
  }

  // expose
  return {
    state,
    update,
    tap,
    act,
    buy,
    rename,
    reset,
  };
}

