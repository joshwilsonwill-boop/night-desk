// Night Desk: entry point. Wires the canvas, input, world and renderer
// together, runs the fixed-step loop, and stages screenshot scenes when
// the page is opened with a ?shot= query parameter.
import { CANVAS_HEIGHT, CANVAS_WIDTH, STEP } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createInput } from './input.js';
import { createWorld } from './world.js';
import { drawWorld } from './render.js';
import { stageShot } from './shots.js';
import { ensureAudio } from './sound.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');
const world = createWorld();
const input = createInput(canvas);
const status = document.getElementById('status');
// Debug handle for automated playtests (read-only inspection).
window.__nightDesk = world;

function setStatus(text) {
  if (status) status.textContent = text;
}

function paint() {
  drawWorld(ctx, world);
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

if (shot) {
  // Screenshot mode: stage the scene, paint it synchronously twice, then
  // signal the capture rig. No loop, no audio, no input.
  try {
    const staged = stageShot(shot, world);
    world.screen = staged.screen;
    paint();
    paint();
    window.__shotReady = true;
  } catch (error) {
    window.__shotError = String(error && error.message ? error.message : error);
  }
} else {
  let lastTime = performance.now();
  let accumulator = 0;

  window.addEventListener('keydown', (event) => {
    ensureAudio();
    const key = event.key.toLowerCase();
    if (key === 'enter') {
      if (world.screen === SCREEN_TITLE || world.screen === SCREEN_WIN || world.screen === SCREEN_CAUGHT) {
        world.startGame();
        setStatus('Game started. Steal the data core, then reach the exit.');
      } else if (world.screen === SCREEN_PAUSED) {
        world.togglePause();
      }
    }
    if ((key === 'p' || key === 'escape') && (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSED)) {
      world.togglePause();
    }
  });

  canvas.addEventListener('mousedown', () => ensureAudio());

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (world.screen === SCREEN_PLAY) {
        const move = input.moveVector();
        const coinTarget = input.consumeCoin();
        world.step(STEP, { x: move.x, y: move.y, sneak: input.pressed('shift') }, coinTarget);
      } else {
        input.consumeCoin();
      }
    }
    paint();
    requestAnimationFrame(frame);
  }

  setStatus('Night Desk. Press Enter to start.');
  paint();
  requestAnimationFrame(frame);
}
