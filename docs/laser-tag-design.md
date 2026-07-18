# Laser Tag — Game Design

A last-player-standing arena game inspired by Tron light cycles and *Achtung, die Kurve!*. Players pilot triangular ships that constantly move forward, leaving permanent laser trails. Touch any trail or a wall and you're annihilated. Last ship flying wins.

## Core Rules

- **2–6 players** per match. On the setup screen the user picks the player count and sets each slot to **Human** or **CPU**.
- The board is a **coarse pixel grid** (72×48 cells). Each cell is drawn as an **8×8** block of canvas pixels so trails read as chunky retro tiles. Ships advance one cell at a time at a constant rate, always axis-aligned (up/down/left/right), Tron light-cycle style.
- Steering is **absolute**: each player has four direction keys. Pressing a direction turns the ship to travel that way; pressing the direction it's already going, or the exact opposite (a 180 into its own trail), does nothing.
- Every ship leaves a **permanent laser trail** along its path. Trails never fade or disappear during a round.
- A ship is **annihilated** when its nose touches:
  - any laser trail (including its own),
  - any arena wall (the canvas edge).
- Annihilation triggers a brief particle burst; the ship's trail stays on the field.
- The **last surviving ship wins the round**. If the final two die in the same frame, the round is a draw.
- Matches are played in **rounds**. A scoreboard tracks round wins; players return to the arena with "Next Round" and can end the match anytime. (First team to any score — it's honor-system arcade rules.)

## Screens & Flow

```
Lobby (arcade index) → Setup → Countdown (3-2-1) → Round → Round Over → Countdown → ...
                          ↑__________________ "Change Players" ______________|
```

1. **Setup** — pick player count (2–6); per slot: Human/CPU toggle, fixed color + name (Player 1–6); shows each human's control keys. Start button.
2. **Countdown** — ships placed at spawn points, 3-2-1 overlay, then simultaneous launch.
3. **Round** — live play. A small HUD shows who's still alive.
4. **Round Over** — banner with the winner's color/name (or "Draw!"), updated scoreboard, buttons: *Next Round*, *Change Players*.

## Controls

Four **absolute direction keys** per human player. A press sets the travel direction directly; same-direction and opposite-direction presses are ignored (no reversing into your own trail). Turns are queued (max 2) and applied one per grid step so fast maneuvers register cleanly.

| Slot | Up | Left | Down | Right |
|------|----|------|------|-------|
| P1 (red)     | `↑` | `←` | `↓` | `→` |
| P2 (blue)    | `W` | `A` | `S` | `D` |
| P3 (green)   | `I` | `J` | `K` | `L` |
| P4 (yellow)  | `T` | `F` | `G` | `H` |
| P5 (magenta) | `Num8` | `Num4` | `Num5` | `Num6` |
| P6 (cyan)    | `Home` | `Del` | `End` | `PgDn` |

Realistically 2–4 humans fit on one keyboard (P5/P6 need a full-size board); slots default to CPU beyond P2.

## Mechanics Detail

- **Arena:** a fixed grid of **72×48 cells**. The canvas is **576×384** (each cell = **8×8** canvas pixels) and upscaled with `image-rendering: pixelated`, so every trail cell is a crisp solid block — no anti-aliasing, no glow bleed, no background showing through a trail cell. A fully walled-in board can be completely covered by trails.
- **Pause:** pressing **`P`** toggles pause during a live round (and unpauses). While paused, simulation freezes; an overlay shows "PAUSED".
- **Movement:** each ship occupies one cell and has one of four directions. The simulation advances in fixed **grid steps** (~12 cells/s, accumulator-driven inside `requestAnimationFrame` so speed is refresh-rate independent). Each step the ship moves exactly one cell; its vacated cell becomes permanent trail. Turn inputs are queued (max 2 pending) and applied one per step. Living ships' head cells are drawn as the pentagon (not a filled trail square) so the shape stays visible.
- **Spawning:** ships spawn evenly spaced on a circle around the grid center, each facing the axis-aligned direction closest to "outward-tangential", guaranteeing fair initial separation.
- **Collision:** the source of truth is a plain **occupancy grid** (one byte per cell — trail or empty; heads count as occupied). Each step, every living ship computes its next cell; it dies if that cell is off the board, already occupied, or targeted by another ship's head in the same step (head-on = both die). No pixel sampling, no grace period — reversing into your own trail is impossible by the control rules, and everything else is a legitimate kill.
- **CPU pilots:** survival-first. A bot never turns into an immediate obstacle and never crashes unless it is truly boxed in:
  - Each step it counts the clear cells straight ahead, to its left, and to its right by walking the occupancy grid (walls block).
  - It keeps going straight while the path ahead is comfortably clear (beyond a small randomized danger threshold in cells), so bots don't jitter or turn pointlessly.
  - When the path ahead gets short, it evaluates both turn options by **flood-filling** the occupancy grid to estimate how much open area is reachable in each direction, choosing the roomier side — this stops bots from turning into dead-end pockets they could see was a trap.
  - It only continues into a fatal wall/trail when ahead, left, and right are all blocked (genuinely boxed in).
  - Randomized per-bot thresholds keep the bots from playing identically.
- **Fairness:** all ships (human and CPU) update in the same tick; deaths are resolved after all moves so mutual kills are draws.

## Visual Style

**Hard-edged retro pixel art.** The board is rendered at native 576×384 (72×48 cells × 8px) and upscaled with nearest-neighbor (`image-rendering: pixelated`); trails are solid 8×8 cell blocks in each player's color with **no glow, bevel, or anti-aliasing** — adjacent trails tile perfectly with no background between them. The ship **head fits in a single cell**: a pixel-art **pentagon** (square back, pointy tip facing travel direction) drawn inside that one 8×8 cell. Death bursts are scattered 8×8 (or 1 cell) pixels. Near-black background, bright saturated per-player colors. Glow and the chunky pixel font ("Press Start 2P") live only in the surrounding DOM UI (menus, HUD, countdown, pause), never on the board.

## File Layout

```
games/laser-tag/
├── index.html      # canvas + setup/overlay DOM
├── style.css       # game-specific styling
├── main.js         # bootstrapping, screen/state machine, input
├── game.js         # simulation: ships, trails, collision, rounds
├── ai.js           # CPU pilot logic
└── render.js       # drawing: arena, ships, trails, particles, HUD
```

## Out of Scope (for v1)

- Online multiplayer, gamepads, touch controls
- Power-ups, trail gaps, speed changes
- Sound (nice-to-have for v2)
