// Night Desk: keyboard and mouse input. Movement keys, sneak, pause, and
// click to toss a distraction coin. The main loop reads this state.
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    sneak: false,
    coinTarget: null, // { x, y } in canvas pixels, set on click, consumed by world
    clicked: false,
    anyKey: false,
  };

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    keys.add(key);
    state.anyKey = true;
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    state.coinTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    state.clicked = true;
    state.anyKey = true;
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);

  state.moveVector = function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  };

  state.pressed = function pressed(key) {
    return keys.has(key);
  };

  state.consumeCoin = function consumeCoin() {
    const target = state.coinTarget;
    state.coinTarget = null;
    state.clicked = false;
    return target;
  };

  state.consumeAnyKey = function consumeAnyKey() {
    const value = state.anyKey;
    state.anyKey = false;
    return value;
  };

  return state;
}
