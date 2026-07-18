# Olive Wars — Game Design

You are a stuffed olive on the ground. Overhead, rogue vegetables cruise past. Launch your pimentos, shoot them down, and don't get splattered when the wreckage hits the dirt. Score is veggies downed before someone gets smooshed.

## Core Rules

- **1–2 human players.** Setup picks solo or co-op. No CPU olives.
- Olives stand on the **ground** and can only move **left / right**.
- Vegetables (broccoli, mushroom, tomato, eggplant) **fly left → right** at varying altitudes.
- Press the shoot key to launch a **pimento** upward. On hit, the veggie is "downed": it stops flying and **falls**.
- A falling veggie that reaches the ground **explodes**. If the blast overlaps an olive, that olive is out — **game over** for the match (shared lives: any olive hit ends the round).
- Goal: **down as many veggies as possible** before game over. Score is shared (co-op).

## Screens & Flow

```
Lobby → Setup → Playing → Game Over → Setup (Play Again)
```

1. **Setup** — 1 or 2 players; shows control keys; Start.
2. **Playing** — live action, score HUD, optional pause (`P`).
3. **Game Over** — final score, Play Again / Change Players.

## Controls

| Slot | Left | Right | Shoot |
|------|------|-------|-------|
| P1 (green olive) | `←` | `→` | `Space` |
| P2 (black olive) | `A` | `D` | `F` |

Pause: `P`.

## Mechanics Detail

- **Arena:** canvas **720×480** (4:3), ground strip along the bottom. Soft late-90s / early-2000s pre-rendered CG sprites (not hard pixel art, not smooth modern).
- **Movement:** olives accelerate left/right with a max speed and stop at the canvas edges. They stay on the ground line.
- **Shooting:** rate-limited pimento shots travel upward; removed off-screen or on hit.
- **Veggie spawn:** timed spawns from the left edge; type randomized; altitude and speed vary; spawn rate and speed ramp gently with score/time.
- **Collision:** AABB hitboxes (slightly inset from sprite bounds). Pimento↔flying veggie → down. Falling veggie↔ground → explosion. Explosion radius vs olive hitbox → game over.
- **Scoring:** +1 per veggie successfully shot (credited when the shot connects).

## Visual Style

Late-90s / early-2000s **pre-rendered 3D clip-art** look: soft airbrushed shading, glossy highlights, slightly chunky, no nearest-neighbor pixel scaling. Sprites live in `sprites/`. Canvas uses normal (smooth-ish) image smoothing off just enough to keep edges a bit soft — not `image-rendering: pixelated`.

## Audio

**Cannot ship the copyrighted Yakety Sax recording.** Instead:

1. An **original silly chase-theme** synthesized with the Web Audio API (`music.js`) — jaunty sax-ish lead + walking bass comedy energy.
2. Optional drop-in: place a licensed file at `audio/chase-theme.mp3` (or `.ogg`); if present it is preferred over the synth loop.

Music starts on first user gesture (Start), muted until then (browser autoplay policy).

## File Layout

```
games/olive-wars/
├── index.html
├── style.css
├── main.js
├── game.js
├── render.js
├── music.js
├── sprites/
│   ├── olive_green.png
│   ├── olive_black.png
│   ├── pimento.png
│   ├── broccoli.png
│   ├── mushroom.png
│   ├── tomato.png
│   ├── eggplant.png
│   └── explosion.png
└── audio/          # optional licensed chase theme drop-in
```

## Out of Scope (v1)

- Online multiplayer, gamepads, touch
- Power-ups, multiple lives, wave bosses
- Sound effects beyond the chase theme (nice-to-have)
