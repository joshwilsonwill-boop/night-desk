// Night Desk: level layout and tuning constants. One floor of the Meridian
// Archive at night: three zones split by partition walls, plants and crates
// for cover, shadow carpet that hides you, a data core to steal, and an
// exit door on the far side. All art is drawn procedurally on canvas.
export const TILE = 64;
export const COLS = 20;
export const ROWS = 10;
export const FIELD_WIDTH = COLS * TILE; // 1280
export const FIELD_HEIGHT = ROWS * TILE; // 640
export const HUD_HEIGHT = 80;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const STEP = 1 / 60;

// Map legend:
//   # wall (blocks sight and movement)
//   . open floor
//   C crate (blocks sight and movement, low cover)
//   B bush (plant cluster: hides you while you stand in it, blocks sight of you only)
//   S shadow carpet (dark floor: you are harder to spot here)
//   P player start
//   K data core (the objective)
//   E exit door
export const MAP = [
  '####################',
  '#P...S....B........#',
  '#.##....C....##....#',
  '#......#.....#.....#',
  '#.C....#..B..#.....#',
  '#..B...#.....#.....#',
  '#......#..C..#....K#',
  '#.##...#.....#.....#',
  '#...S......B....#E.#',
  '####################',
];

export const PLAYER_SPEED = 175;
export const PLAYER_SNEAK_SPEED = 95;
export const PLAYER_RADIUS = 14;
export const GUARD_RADIUS = 15;

export const GUARD_PATROL_SPEED = 72;
export const GUARD_INVESTIGATE_SPEED = 112;
export const GUARD_ALARM_SPEED = 152;

export const CONE_RANGE = 235;
export const CONE_HALF_ANGLE = 0.62; // about 35 degrees each side
export const SPOT_RATE = 58; // suspicion per second, fully visible, standing
export const SUSPICION_DECAY = 34; // suspicion per second, unseen
export const SHADOW_FACTOR = 0.45; // detection is slower on shadow carpet
export const SNEAK_FACTOR = 0.5; // sneaking is harder to spot
export const BUSH_HIDE_RANGE = 52; // a guard this close still spots you in a bush
export const CATCH_RANGE = 28; // an alarmed guard this close catches you
export const ALARM_LOOK_TIME = 3.0; // seconds a guard searches the last seen spot
export const UNSEEN_CALM_TIME = 4.0; // seconds unseen before guards stand down
export const COIN_COUNT = 3;
export const COIN_RANGE = 280; // how far you can toss a coin
export const COIN_NOISE_RANGE = 340; // guards inside this range investigate the coin

export const PAR_TIME = 240; // seconds: beating it earns a time bonus

// Guards: name, patrol waypoints in tile coordinates, and a pause at each stop.
export const GUARDS = [
  {
    name: 'Rook',
    waypoints: [[8, 3], [12, 3], [12, 7], [8, 7]],
    pause: 1.2,
  },
  {
    name: 'Vesper',
    waypoints: [[15, 2], [18, 2], [18, 7], [15, 7]],
    pause: 1.6,
  },
  {
    name: 'Marlowe',
    waypoints: [[1, 8], [5, 8], [5, 3], [1, 3]],
    pause: 1.0,
  },
];

export function tileAt(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return MAP[row][col];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function findTile(ch) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (MAP[row][col] === ch) return { col, row };
    }
  }
  return null;
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}
