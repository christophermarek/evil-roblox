# Evil Robloxia

A player-as-villain town sandbox for Roblox. The town is innocent and alive — NPCs
follow believable daily routines (home → work/store/school → home). **You are the bad
guy.** The whole game is about reading those routines and exploiting them: rob the store
while the shopkeeper is at lunch, burgle a house while the family is at school, hijack a
car on its route — then outrun the heat.

## Tech stack

- **TypeScript (strict)** → Luau via **[roblox-ts](https://roblox-ts.com)** (`rbxtsc`)
- **[Flamework](https://flamework.fireboltofdeath.dev/)** — DI / lifecycle + typed networking
- **[Rojo](https://rojo.space/)** — filesystem → Roblox Studio sync
- **Roact** — UI

## Project docs

- [DESIGN.md](DESIGN.md) — game design & technical architecture (source of truth)
- [BUILD_PLAN.md](BUILD_PLAN.md) — the loop-able build plan (M0 → M3)

## Develop

```sh
npm install
npm run dev      # rbxtsc -w + rojo serve, then connect the Rojo plugin in Studio
```

Compiled Luau lands in `out/` (git-ignored); source lives in `src/`.
