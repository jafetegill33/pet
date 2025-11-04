import mitt from 'mitt';
import { createGame } from './game.js';
import { createUI } from './ui.js';
import { loadState, saveState } from './storage.js';

const bus = mitt();
const persisted = loadState();
const game = createGame(bus, persisted);
const ui = createUI(bus, game);

function tick() {
  game.update();
  requestAnimationFrame(tick);
}
game.update();
requestAnimationFrame(tick);

setInterval(() => saveState(game.state), 10000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveState(game.state);
});

window.addEventListener('beforeunload', () => saveState(game.state));

