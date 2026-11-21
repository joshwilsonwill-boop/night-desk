// Night Desk: the game world. Guards patrol, spot you, raise the alarm,
// investigate the last place they saw you, and give up and go back to
// patrol when they lose you. You steal the data core, then reach the exit.
import {
  ALARM_LOOK_TIME,
  BUSH_HIDE_RANGE,
  CATCH_RANGE,
  COIN_COUNT,
  COIN_NOISE_RANGE,
  COIN_RANGE,
  CONE_HALF_ANGLE,
  CONE_RANGE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GUARDS,
  GUARD_ALARM_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_RADIUS,
  MAP,
  PAR_TIME,
  PLAYER_RADIUS,
  PLAYER_SNEAK_SPEED,
  PLAYER_SPEED,
  ROWS,
  SHADOW_FACTOR,
  SNEAK_FACTOR,
  SPOT_RATE,
  STEP,
  SUSPICION_DECAY,
  TILE,
  UNSEEN_CALM_TIME,
  findTile,
  isSolidTile,
  tileAt,
  tileCenter,
} from './config.js';
import { SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './input.js';
import { playAlert, playCaught, playCoin, playPickup, playStep, playWin } from './sound.js';

export const MODE_PATROL = 'patrol';
export const MODE_INVESTIGATE = 'investigate';
export const MODE_ALARM = 'alarm';
export const MODE_RETURN = 'return';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// True when a wall or crate blocks the straight line between the two points.
export function lineBlocked(x1, y1, x2, y2) {
  const d = dist(x1, y1, x2, y2);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i += 1) {
    const x = x1 + ((x2 - x1) * i) / steps;
    const y = y1 + ((y2 - y1) * i) / steps;
    if (isSolidTile(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)))) return true;
  }
  return false;
}

function solidAtPixel(x, y) {
  return isSolidTile(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)));
}

// Move a circle against solid tiles, axis by axis, so it slides along walls.
function moveCircle(body, dx, dy, radius) {
  const nextX = body.x + dx;
  if (!solidAtPixel(nextX + Math.sign(dx) * radius, body.y - radius * 0.7)
    && !solidAtPixel(nextX + Math.sign(dx) * radius, body.y + radius * 0.7)
    && !solidAtPixel(nextX + Math.sign(dx) * radius, body.y)) {
    body.x = nextX;
  }
  const nextY = body.y + dy;
  if (!solidAtPixel(body.x - radius * 0.7, nextY + Math.sign(dy) * radius)
    && !solidAtPixel(body.x + radius * 0.7, nextY + Math.sign(dy) * radius)
    && !solidAtPixel(body.x, nextY + Math.sign(dy) * radius)) {
    body.y = nextY;
  }
  body.x = clamp(body.x, radius, FIELD_WIDTH - radius);
  body.y = clamp(body.y, radius, FIELD_HEIGHT - radius);
}

export function createWorld() {
  const world = {
    state: null,
    screen: SCREEN_TITLE,
    best: 0,
    message: '',
    messageTimer: 0,
  };

  world.reset = function reset() {
    const start = tileCenter(findTile('P').col, findTile('P').row);
    const core = tileCenter(findTile('K').col, findTile('K').row);
    const exit = tileCenter(findTile('E').col, findTile('E').row);
    world.state = {
      player: {
        x: start.x, y: start.y, angle: 0, sneaking: false, moving: false,
        stepTimer: 0, radius: PLAYER_RADIUS,
      },
      guards: GUARDS.map((def) => {
        const first = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
        const second = tileCenter(def.waypoints[1][0], def.waypoints[1][1]);
        return {
          name: def.name,
          def,
          x: first.x, y: first.y,
          angle: Math.atan2(second.y - first.y, second.x - first.x),
          waypointIndex: 1,
          pauseTimer: 0,
          mode: MODE_PATROL,
          suspicion: 0,
          targetX: second.x, targetY: second.y,
          lookTimer: 0,
          stepTimer: 0,
          lastSeenX: 0, lastSeenY: 0,
          radius: GUARD_RADIUS,
        };
      }),
      core: { x: core.x, y: core.y, taken: false },
      exit: { x: exit.x, y: exit.y },
      elapsed: 0,
      score: 0,
      alarms: 0,
      spottedEver: false,
      coins: COIN_COUNT,
      coinMarks: [], // { x, y, age }
      unseenTimer: 0,
      anyAlarm: false,
      caught: false,
      won: false,
      rank: '',
      finalTime: 0,
    };
    world.screen = SCREEN_TITLE;
    world.message = '';
    world.messageTimer = 0;
  };

  world.startGame = function startGame() {
    world.reset();
    world.screen = SCREEN_PLAY;
  };

  function toast(text, seconds) {
    world.message = text;
    world.messageTimer = seconds;
  }

  function raiseAlarm(spotter) {
    const state = world.state;
    state.alarms += 1;
    state.spottedEver = true;
    state.anyAlarm = true;
    state.unseenTimer = 0;
    for (const guard of state.guards) {
      guard.lastSeenX = state.player.x;
      guard.lastSeenY = state.player.y;
      if (guard === spotter) {
        guard.mode = MODE_ALARM;
      } else if (guard.mode !== MODE_ALARM) {
        guard.mode = MODE_INVESTIGATE;
        guard.targetX = state.player.x;
        guard.targetY = state.player.y;
        guard.lookTimer = 0;
      }
    }
    playAlert();
    toast('SPOTTED. Break line of sight and hide.', 3);
  }

  function standDown() {
    const state = world.state;
    state.anyAlarm = false;
    for (const guard of state.guards) {
      if (guard.mode === MODE_ALARM) {
        guard.mode = MODE_INVESTIGATE;
        guard.targetX = guard.lastSeenX;
        guard.targetY = guard.lastSeenY;
        guard.lookTimer = 0;
      }
      guard.suspicion = 0;
    }
    toast('They lost you. Stay quiet.', 2.5);
  }

  function updateGuard(guard, dt) {
    const state = world.state;
    const player = state.player;
    if (guard.mode === MODE_PATROL) {
      const wp = guard.def.waypoints[guard.waypointIndex];
      const target = tileCenter(wp[0], wp[1]);
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.angle += Math.sin(world.state.elapsed * 1.4 + guard.waypointIndex) * dt * 0.6;
        return;
      }
      const d = dist(guard.x, guard.y, target.x, target.y);
      if (d < 6) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.def.waypoints.length;
        guard.pauseTimer = guard.def.pause;
        return;
      }
      const angle = Math.atan2(target.y - guard.y, target.x - guard.x);
      guard.angle = angle;
      moveCircle(guard, Math.cos(angle) * GUARD_PATROL_SPEED * dt, Math.sin(angle) * GUARD_PATROL_SPEED * dt, guard.radius);
      guardStep(guard, dt, GUARD_PATROL_SPEED);
      return;
    }
    if (guard.mode === MODE_ALARM) {
      const d = dist(guard.x, guard.y, guard.lastSeenX, guard.lastSeenY);
      if (d < 10) {
        guard.mode = MODE_INVESTIGATE;
        guard.targetX = guard.lastSeenX;
        guard.targetY = guard.lastSeenY;
        guard.lookTimer = 0;
        return;
      }
      const angle = Math.atan2(guard.lastSeenY - guard.y, guard.lastSeenX - guard.x);
      guard.angle = angle;
      moveCircle(guard, Math.cos(angle) * GUARD_ALARM_SPEED * dt, Math.sin(angle) * GUARD_ALARM_SPEED * dt, guard.radius);
      guardStep(guard, dt, GUARD_ALARM_SPEED);
      return;
    }
    if (guard.mode === MODE_INVESTIGATE) {
      const d = dist(guard.x, guard.y, guard.targetX, guard.targetY);
      if (d > 10) {
        const angle = Math.atan2(guard.targetY - guard.y, guard.targetX - guard.x);
        guard.angle = angle;
        moveCircle(guard, Math.cos(angle) * GUARD_INVESTIGATE_SPEED * dt, Math.sin(angle) * GUARD_INVESTIGATE_SPEED * dt, guard.radius);
        guardStep(guard, dt, GUARD_INVESTIGATE_SPEED);
        return;
      }
      guard.lookTimer += dt;
      guard.angle += dt * 1.8;
      if (guard.lookTimer >= ALARM_LOOK_TIME) {
        guard.mode = MODE_RETURN;
      }
      return;
    }
    // MODE_RETURN: walk back to the nearest patrol waypoint, then patrol.
    let bestIndex = 0;
    let bestDist = Infinity;
    guard.def.waypoints.forEach((wp, index) => {
      const point = tileCenter(wp[0], wp[1]);
      const d = dist(guard.x, guard.y, point.x, point.y);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = index;
      }
    });
    const target = tileCenter(guard.def.waypoints[bestIndex][0], guard.def.waypoints[bestIndex][1]);
    if (bestDist < 8) {
      guard.waypointIndex = (bestIndex + 1) % guard.def.waypoints.length;
      guard.mode = MODE_PATROL;
      guard.pauseTimer = 0.5;
      return;
    }
    const angle = Math.atan2(target.y - guard.y, target.x - guard.x);
    guard.angle = angle;
    moveCircle(guard, Math.cos(angle) * GUARD_PATROL_SPEED * dt, Math.sin(angle) * GUARD_PATROL_SPEED * dt, guard.radius);
    guardStep(guard, dt, GUARD_PATROL_SPEED);
  }

  function guardStep(guard, dt, speed) {
    guard.stepTimer -= dt;
    if (guard.stepTimer <= 0) {
      guard.stepTimer = 0.55 * (GUARD_PATROL_SPEED / speed) + 0.18;
      const d = dist(guard.x, guard.y, world.state.player.x, world.state.player.y);
      playStep(false, clamp(1 - d / 420, 0, 1));
    }
  }

  function updateDetection(dt) {
    const state = world.state;
    const player = state.player;
    const playerTile = tileAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    const inBush = playerTile === 'B';
    const inShadow = playerTile === 'S';
    let anyoneSees = false;
    for (const guard of state.guards) {
      const d = dist(guard.x, guard.y, player.x, player.y);
      let visible = false;
      if (d < CONE_RANGE) {
        const toPlayer = Math.atan2(player.y - guard.y, player.x - guard.x);
        if (Math.abs(angleDiff(toPlayer, guard.angle)) < CONE_HALF_ANGLE) {
          visible = !lineBlocked(guard.x, guard.y, player.x, player.y);
        }
      }
      if (visible && inBush && d > BUSH_HIDE_RANGE) visible = false;
      if (visible) {
        anyoneSees = true;
        let factor = 1;
        if (inShadow) factor *= SHADOW_FACTOR;
        if (player.sneaking) factor *= SNEAK_FACTOR;
        if (d < 90) factor *= 1.6;
        guard.suspicion += SPOT_RATE * factor * dt;
        guard.lastSeenX = player.x;
        guard.lastSeenY = player.y;
        if (guard.mode === MODE_ALARM) {
          // Keep chasing the live position while seen.
        } else if (guard.suspicion >= 100) {
          guard.suspicion = 100;
          raiseAlarm(guard);
        }
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
      }
      if (guard.mode === MODE_ALARM && d < CATCH_RANGE) {
        state.caught = true;
      }
    }
    if (anyoneSees) {
      state.unseenTimer = 0;
    } else {
      state.unseenTimer += dt;
      if (state.anyAlarm && state.unseenTimer >= UNSEEN_CALM_TIME) standDown();
    }
  }

  function updatePlayer(move, dt) {
    const state = world.state;
    const player = state.player;
    const sneak = move.sneak;
    player.sneaking = sneak;
    const speed = sneak ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
    const moving = move.x !== 0 || move.y !== 0;
    player.moving = moving;
    if (moving) {
      player.angle = Math.atan2(move.y, move.x);
      moveCircle(player, move.x * speed * dt, move.y * speed * dt, player.radius);
      player.stepTimer -= dt;
      if (player.stepTimer <= 0) {
        player.stepTimer = sneak ? 0.55 : 0.38;
        playStep(true, sneak ? 0.25 : 0.6);
      }
    }
  }

  function updateCoin(coinTarget) {
    const state = world.state;
    if (!coinTarget || state.coins <= 0) return;
    const player = state.player;
    let dx = coinTarget.x - player.x;
    let dy = coinTarget.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > COIN_RANGE) {
      dx = (dx / d) * COIN_RANGE;
      dy = (dy / d) * COIN_RANGE;
    }
    const landX = clamp(player.x + dx, TILE, FIELD_WIDTH - TILE);
    const landY = clamp(player.y + dy, TILE, FIELD_HEIGHT - TILE);
    if (solidAtPixel(landX, landY)) return;
    state.coins -= 1;
    state.coinMarks.push({ x: landX, y: landY, age: 0 });
    playCoin();
    for (const guard of state.guards) {
      if (dist(guard.x, guard.y, landX, landY) < COIN_NOISE_RANGE && guard.mode !== MODE_ALARM) {
        guard.mode = MODE_INVESTIGATE;
        guard.targetX = landX;
        guard.targetY = landY;
        guard.lookTimer = 0;
        guard.suspicion = Math.max(guard.suspicion, 35);
      }
    }
    toast('Coin tossed. A guard heard it.', 2);
  }

  function updateObjectives() {
    const state = world.state;
    const player = state.player;
    if (!state.core.taken && dist(player.x, player.y, state.core.x, state.core.y) < 34) {
      state.core.taken = true;
      playPickup();
      toast('Data core stolen. Reach the green exit door.', 3);
    }
    if (dist(player.x, player.y, state.exit.x, state.exit.y) < 36) {
      if (state.core.taken) {
        state.won = true;
        state.finalTime = state.elapsed;
        state.score = Math.round(
          1000 + Math.max(0, PAR_TIME - state.elapsed) * 5 - state.alarms * 150 + (state.spottedEver ? 0 : 300),
        );
        state.rank = state.score >= 2000 ? 'S' : state.score >= 1600 ? 'A' : state.score >= 1200 ? 'B' : 'C';
        if (state.score > world.best) world.best = state.score;
        playWin();
        world.screen = SCREEN_WIN;
      } else if (world.messageTimer <= 0) {
        toast('Exit locked. Steal the data core first.', 2);
      }
    }
  }

  // Advance the play simulation by dt seconds. `move` is { x, y, sneak }.
  // `coinTarget` is a canvas point the player clicked, or null.
  world.step = function step(dt, move, coinTarget) {
    const state = world.state;
    if (world.screen !== SCREEN_PLAY) return;
    state.elapsed += dt;
    if (world.messageTimer > 0) world.messageTimer -= dt;
    for (const mark of state.coinMarks) mark.age += dt;
    state.coinMarks = state.coinMarks.filter((mark) => mark.age < 5);
    updatePlayer(move, dt);
    updateCoin(coinTarget);
    for (const guard of state.guards) updateGuard(guard, dt);
    updateDetection(dt);
    updateObjectives();
    if (state.caught) {
      playCaught();
      world.screen = SCREEN_CAUGHT;
    }
  };

  world.togglePause = function togglePause() {
    if (world.screen === SCREEN_PLAY) world.screen = SCREEN_PAUSED;
    else if (world.screen === SCREEN_PAUSED) world.screen = SCREEN_PLAY;
  };

  world.formatTime = function formatTime(seconds) {
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
  };

  world.reset();
  return world;
}
