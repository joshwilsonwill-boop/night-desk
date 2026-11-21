# Night Desk

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/joshwilsonwill-boop/night-desk/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/joshwilsonwill-boop/night-desk/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game set in the Meridian Archive at night, made for the
[best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759)
on make.fun. Slip in through the west door, steal the glowing data core from
the guarded east vault, and reach the green exit door unseen. All art is
original and drawn procedurally on canvas 2D; no images, fonts or sounds are
downloaded, and the game runs from static files with zero network requests.

## How to play

- Move with WASD or arrow keys. Hold SHIFT to sneak.
- Guards patrol fixed routes with visible vision cones. Suspicion rises while
  you are seen; a full ring raises the alarm and guards converge on your last
  seen position. Break line of sight to make them search, then return to patrol.
- Crates and walls block sight. Plant bushes hide you. Shadow carpet halves
  detection. Click to toss one of 3 coins and pull a guard away to investigate
  the noise.
- Grab the data core, then reach the exit. Finish fast and unseen for a better
  rank, with a ghost bonus for never being spotted.

## Run it

Serve `game/` from any static server and open `index.html` in desktop Chrome.
`main.ts` (Node 22) copies `game/` and `screenshots/` to the output directory
and writes `dossier.json` for the make.fun grader.
