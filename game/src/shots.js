// Night Desk: screenshot scenes behind ?shot=cover|play|alarm|win. Each one
// sets the real game state to a fixed mid-game moment, so the frame is what
// a real game looks like and the same shot always gives the same frame. No
// randomness is involved: the staged positions are fixed.
import { TILE, tileCenter } from './config.js';
import { SCREEN_PLAY, SCREEN_WIN } from './input.js';
import { MODE_ALARM, MODE_INVESTIGATE, MODE_PATROL } from './world.js';

function placeGuard(guard, col, row, angle, mode, suspicion) {
  const point = tileCenter(col, row);
  guard.x = point.x;
  guard.y = point.y;
  guard.angle = angle;
  guard.mode = mode;
  guard.suspicion = suspicion;
  guard.pauseTimer = 0;
  guard.lookTimer = 0;
}

function placePlayer(state, col, row, angle, sneaking) {
  const point = tileCenter(col, row);
  state.player.x = point.x;
  state.player.y = point.y;
  state.player.angle = angle;
  state.player.sneaking = sneaking;
  state.player.moving = false;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * cover: the whole floor at a glance, guards on patrol, cones, cover, exit.
 * play: mid-play tension, a guard nearly spotting the player at a bush edge.
 * alarm: the alarm state, guards converging on the last seen position.
 * win: the win screen after a clean getaway.
 */
export function stageShot(name, world) {
  world.startGame();
  const state = world.state;
  const guards = state.guards;
  if (name === 'play') {
    state.elapsed = 96;
    state.score = 420;
    placePlayer(state, 15, 5, Math.PI, true);
    placeGuard(guards[0], 10, 3, 0, MODE_PATROL, 0);
    placeGuard(guards[1], 16, 3, Math.PI / 2, MODE_PATROL, 62);
    placeGuard(guards[2], 3, 6, -Math.PI / 2, MODE_PATROL, 0);
    guards[1].lastSeenX = state.player.x;
    guards[1].lastSeenY = state.player.y;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alarm') {
    state.elapsed = 132;
    state.score = 380;
    state.alarms = 1;
    state.anyAlarm = true;
    state.spottedEver = true;
    placePlayer(state, 12, 4, Math.PI, false);
    placeGuard(guards[0], 11, 3, 0.3, MODE_ALARM, 100);
    guards[0].lastSeenX = state.player.x;
    guards[0].lastSeenY = state.player.y;
    placeGuard(guards[1], 15, 5, Math.PI, MODE_INVESTIGATE, 80);
    guards[1].targetX = state.player.x;
    guards[1].targetY = state.player.y;
    placeGuard(guards[2], 5, 5, 0, MODE_INVESTIGATE, 40);
    guards[2].targetX = state.player.x;
    guards[2].targetY = state.player.y;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    state.elapsed = 187;
    state.core.taken = true;
    state.won = true;
    state.finalTime = 187;
    state.score = 2140;
    state.rank = 'A';
    state.alarms = 0;
    state.spottedEver = false;
    placePlayer(state, 17, 8, 0, false);
    placeGuard(guards[0], 10, 3, 0, MODE_PATROL, 0);
    placeGuard(guards[1], 16, 3, Math.PI / 2, MODE_PATROL, 0);
    placeGuard(guards[2], 3, 6, -Math.PI / 2, MODE_PATROL, 0);
    return { screen: SCREEN_WIN };
  }
  // The cover: the player sneaking past the middle patrol, all three guards
  // in view with their cones, the core glowing and the exit door lit.
  state.elapsed = 45;
  state.score = 150;
  placePlayer(state, 9, 5, 0, true);
  placeGuard(guards[0], 10, 3, 0, MODE_PATROL, 0);
  placeGuard(guards[1], 16, 4, Math.PI / 2, MODE_PATROL, 0);
  placeGuard(guards[2], 3, 6, -Math.PI / 2, MODE_PATROL, 0);
  return { screen: SCREEN_PLAY };
}

export { TILE };
