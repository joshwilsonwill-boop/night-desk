// Night Desk: canvas rendering. Floor, walls, cover, vision cones, guards,
// the player, the HUD, and the title, pause, win and caught screens. All
// art is drawn procedurally: no images, no external assets.
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLS,
  CONE_HALF_ANGLE,
  CONE_RANGE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  HUD_HEIGHT,
  MAP,
  ROWS,
  TILE,
  tileAt,
} from './config.js';
import { MODE_ALARM, MODE_INVESTIGATE } from './world.js';
import { SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './input.js';

const FLOOR_A = '#232b3d';
const FLOOR_B = '#1e2534';
const WALL_FILL = '#3d4763';
const WALL_TOP = '#5a6584';
const CRATE_FILL = '#7a5a33';
const CRATE_EDGE = '#a67c4d';
const BUSH_FILL = '#2e6b34';
const BUSH_LIGHT = '#4c9a4f';
const SHADOW_FILL = 'rgba(6, 8, 16, 0.55)';
const CONE_CALM = 'rgba(255, 210, 63, 0.16)';
const CONE_WARY = 'rgba(255, 150, 40, 0.22)';
const CONE_ALARM = 'rgba(255, 60, 50, 0.26)';
const GUARD_BODY = '#e74c3c';
const GUARD_DARK = '#8e2318';
const PLAYER_BODY = '#2fd4c4';
const PLAYER_DARK = '#0f7a70';
const CORE_COLOR = '#37e0ff';
const EXIT_COLOR = '#39d353';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 'S') {
        ctx.fillStyle = SHADOW_FILL;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(120, 140, 190, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = 'rgba(180, 195, 230, 0.5)';
        ctx.font = '11px Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHADOW', x + TILE / 2, y + TILE - 10);
      }
    }
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let col = 0; col <= COLS; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * TILE, 0);
    ctx.lineTo(col * TILE, FIELD_HEIGHT);
    ctx.stroke();
  }
  for (let row = 0; row <= ROWS; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * TILE);
    ctx.lineTo(FIELD_WIDTH, row * TILE);
    ctx.stroke();
  }
}

function drawCone(ctx, guard) {
  const alarmed = guard.mode === MODE_ALARM;
  const wary = guard.suspicion > 35 || guard.mode === MODE_INVESTIGATE;
  ctx.fillStyle = alarmed ? CONE_ALARM : wary ? CONE_WARY : CONE_CALM;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, CONE_RANGE, guard.angle - CONE_HALF_ANGLE, guard.angle + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alarmed ? 'rgba(255, 80, 70, 0.5)' : 'rgba(255, 210, 63, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(guard.x + Math.cos(guard.angle - CONE_HALF_ANGLE) * 18, guard.y + Math.sin(guard.angle - CONE_HALF_ANGLE) * 18);
  ctx.lineTo(guard.x + Math.cos(guard.angle - CONE_HALF_ANGLE) * CONE_RANGE, guard.y + Math.sin(guard.angle - CONE_HALF_ANGLE) * CONE_RANGE);
  ctx.moveTo(guard.x + Math.cos(guard.angle + CONE_HALF_ANGLE) * 18, guard.y + Math.sin(guard.angle + CONE_HALF_ANGLE) * 18);
  ctx.lineTo(guard.x + Math.cos(guard.angle + CONE_HALF_ANGLE) * CONE_RANGE, guard.y + Math.sin(guard.angle + CONE_HALF_ANGLE) * CONE_RANGE);
  ctx.stroke();
}

function drawWallsAndCover(ctx) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') {
        ctx.fillStyle = WALL_FILL;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(x, y, TILE, 6);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (ch === 'C') {
        ctx.fillStyle = CRATE_FILL;
        roundRect(ctx, x + 6, y + 6, TILE - 12, TILE - 12, 6);
        ctx.fill();
        ctx.strokeStyle = CRATE_EDGE;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6);
        ctx.lineTo(x + TILE - 6, y + TILE - 6);
        ctx.moveTo(x + TILE - 6, y + 6);
        ctx.lineTo(x + 6, y + TILE - 6);
        ctx.stroke();
      } else if (ch === 'B') {
        ctx.fillStyle = BUSH_FILL;
        ctx.beginPath();
        ctx.arc(x + 20, y + 34, 16, 0, Math.PI * 2);
        ctx.arc(x + 44, y + 28, 18, 0, Math.PI * 2);
        ctx.arc(x + 32, y + 46, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = BUSH_LIGHT;
        ctx.beginPath();
        ctx.arc(x + 24, y + 28, 7, 0, Math.PI * 2);
        ctx.arc(x + 44, y + 40, 6, 0, Math.PI * 2);
        ctx.arc(x + 36, y + 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawCore(ctx, core, elapsed) {
  const pulse = 0.6 + Math.sin(elapsed * 3) * 0.25;
  ctx.save();
  ctx.globalAlpha = 0.25 * pulse;
  ctx.fillStyle = CORE_COLOR;
  ctx.beginPath();
  ctx.arc(core.x, core.y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#2a2f42';
  roundRect(ctx, core.x - 20, core.y - 14, 40, 28, 5);
  ctx.fill();
  ctx.strokeStyle = CORE_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(core.x, core.y - 16);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = CORE_COLOR;
  ctx.globalAlpha = pulse;
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();
  ctx.fillStyle = CORE_COLOR;
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DATA CORE', core.x, core.y + 30);
}

function drawExit(ctx, exit, coreTaken, elapsed) {
  const glow = coreTaken ? 0.5 + Math.sin(elapsed * 4) * 0.25 : 0.18;
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = EXIT_COLOR;
  ctx.fillRect(exit.x - 30, exit.y - 30, 60, 60);
  ctx.restore();
  ctx.fillStyle = coreTaken ? '#12351a' : '#2a2f42';
  roundRect(ctx, exit.x - 26, exit.y - 26, 52, 52, 6);
  ctx.fill();
  ctx.strokeStyle = EXIT_COLOR;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = EXIT_COLOR;
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', exit.x, exit.y - 34);
  ctx.beginPath();
  ctx.moveTo(exit.x - 10, exit.y - 8);
  ctx.lineTo(exit.x + 8, exit.y);
  ctx.lineTo(exit.x - 10, exit.y + 8);
  ctx.closePath();
  ctx.fill();
  if (!coreTaken) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '10px Verdana, sans-serif';
    ctx.fillText('LOCKED', exit.x, exit.y + 40);
  }
}

function drawGuard(ctx, guard) {
  ctx.fillStyle = GUARD_DARK;
  ctx.beginPath();
  ctx.arc(guard.x + 2, guard.y + 3, guard.radius + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GUARD_BODY;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius - 3, guard.angle - 0.7, guard.angle + 0.7);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(
    guard.x + Math.cos(guard.angle) * 8,
    guard.y + Math.sin(guard.angle) * 8,
    4, 0, Math.PI * 2,
  );
  ctx.fill();
  // Suspicion arc and mark above the guard.
  if (guard.suspicion > 2 || guard.mode === MODE_ALARM) {
    const frac = guard.mode === MODE_ALARM ? 1 : guard.suspicion / 100;
    ctx.strokeStyle = guard.mode === MODE_ALARM ? '#ff5040' : '#ffb020';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
  if (guard.mode === MODE_ALARM) {
    ctx.fillStyle = '#ff5040';
    ctx.font = 'bold 20px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - guard.radius - 12);
  } else if (guard.suspicion > 35) {
    ctx.fillStyle = '#ffb020';
    ctx.font = 'bold 18px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - guard.radius - 12);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y + guard.radius + 14);
}

function drawPlayer(ctx, player) {
  const radius = player.sneaking ? player.radius - 3 : player.radius;
  ctx.fillStyle = PLAYER_DARK;
  ctx.beginPath();
  ctx.arc(player.x + 2, player.y + 3, radius + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PLAYER_BODY;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.angle) * (radius + 7), player.y + Math.sin(player.angle) * (radius + 7));
  ctx.stroke();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(47, 212, 196, 0.7)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawCoinMarks(ctx, marks) {
  for (const mark of marks) {
    const alpha = Math.max(0, 1 - mark.age / 5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, 6 + mark.age * 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHud(ctx, world) {
  const state = world.state;
  const y0 = FIELD_HEIGHT;
  ctx.fillStyle = '#11141b';
  ctx.fillRect(0, y0, CANVAS_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = '#2a3145';
  ctx.fillRect(0, y0, CANVAS_WIDTH, 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Verdana, sans-serif';
  const objective = state.core.taken ? 'OBJECTIVE: REACH THE EXIT' : 'OBJECTIVE: STEAL THE DATA CORE';
  ctx.fillText(objective, 16, y0 + 30);
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillStyle = '#9aa5bd';
  ctx.fillText('WASD or arrows to move. SHIFT to sneak. CLICK to toss a coin. P to pause.', 16, y0 + 56);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Verdana, sans-serif';
  ctx.fillText(`TIME ${world.formatTime(state.elapsed)}`, CANVAS_WIDTH / 2 - 60, y0 + 30);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`SCORE ${state.score}`, CANVAS_WIDTH / 2 + 90, y0 + 30);
  const maxSuspicion = Math.max(0, ...state.guards.map((g) => g.suspicion));
  ctx.fillStyle = '#9aa5bd';
  ctx.font = '12px Verdana, sans-serif';
  ctx.fillText('SPOTTED', CANVAS_WIDTH / 2 - 60, y0 + 56);
  ctx.fillStyle = '#2a3145';
  ctx.fillRect(CANVAS_WIDTH / 2 - 10, y0 + 45, 120, 12);
  ctx.fillStyle = maxSuspicion > 70 ? '#ff5040' : '#ffb020';
  ctx.fillRect(CANVAS_WIDTH / 2 - 10, y0 + 45, 120 * (maxSuspicion / 100), 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 15px Verdana, sans-serif';
  ctx.fillText(`COINS ${'●'.repeat(state.coins)}${'○'.repeat(3 - state.coins)}`, CANVAS_WIDTH - 16, y0 + 30);
  if (state.anyAlarm) {
    const blink = Math.floor(state.elapsed * 3) % 2 === 0;
    ctx.fillStyle = blink ? '#ff5040' : '#ffffff';
    ctx.font = 'bold 15px Verdana, sans-serif';
    ctx.fillText('ALARM', CANVAS_WIDTH - 16, y0 + 56);
  } else {
    ctx.fillStyle = '#9aa5bd';
    ctx.font = '13px Verdana, sans-serif';
    ctx.fillText('UNSEEN', CANVAS_WIDTH - 16, y0 + 56);
  }
  if (world.messageTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(17, 20, 27, 0.85)';
    const text = world.message;
    ctx.font = 'bold 14px Verdana, sans-serif';
    const width = ctx.measureText(text).width + 28;
    roundRect(ctx, CANVAS_WIDTH / 2 - width / 2, y0 - 44, width, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, CANVAS_WIDTH / 2, y0 - 23);
  }
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 12, 20, 0.82)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px Verdana, sans-serif';
  ctx.fillText(title, CANVAS_WIDTH / 2, 250);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Verdana, sans-serif';
  let y = 310;
  for (const line of lines) {
    ctx.fillText(line, CANVAS_WIDTH / 2, y);
    y += 30;
  }
}

export function drawWorld(ctx, world) {
  const state = world.state;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawFloor(ctx);
  for (const guard of state.guards) drawCone(ctx, guard);
  drawWallsAndCover(ctx);
  if (!state.core.taken) drawCore(ctx, state.core, state.elapsed);
  drawExit(ctx, state.exit, state.core.taken, state.elapsed);
  drawCoinMarks(ctx, state.coinMarks);
  for (const guard of state.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, state.player);
  drawHud(ctx, world);

  if (world.screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'NIGHT DESK', [
      'A stealth job in the Meridian Archive. Steal the data core, reach the exit unseen.',
      'Yellow cones are guard sight. Bushes hide you. Shadow carpet makes you hard to spot.',
      'SHIFT sneaks. CLICK tosses a coin to pull a guard away. A full suspicion ring means alarm.',
      'If a guard catches you, the job is over.',
      '',
      'Press ENTER to start.',
    ], '#2fd4c4');
  } else if (world.screen === SCREEN_PAUSED) {
    drawOverlay(ctx, 'PAUSED', ['Press P or ENTER to keep working the floor.'], '#ffd23f');
  } else if (world.screen === SCREEN_WIN) {
    drawOverlay(ctx, 'CLEAN GETAWAY', [
      `Time ${world.formatTime(state.finalTime)}  -  Score ${state.score}  -  Rank ${state.rank}`,
      `Alarms raised: ${state.alarms}  -  ${state.spottedEver ? 'You were spotted.' : 'Never spotted. Ghost work.'}`,
      '',
      'Press ENTER to run it again.',
    ], '#39d353');
  } else if (world.screen === SCREEN_CAUGHT) {
    drawOverlay(ctx, 'CAUGHT', [
      'A guard got hands on you. The archive keeps its secrets tonight.',
      `You lasted ${world.formatTime(state.elapsed)}. Alarms raised: ${state.alarms}.`,
      '',
      'Press ENTER to try again.',
    ], '#ff5040');
  }
  void SCREEN_PLAY;
}
