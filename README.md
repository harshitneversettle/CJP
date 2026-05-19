# Modi's Tree Adventure 🌳

A fun browser-based game built with Next.js where Modi eats trees to gain HP while avoiding cockroaches!

## Features

- 🎮 Smooth keyboard controls (Arrow keys or WASD)
- 🌳 Collect trees to gain HP (+20 per tree)
- ⭐ Special power stars appear every 7 seconds (+50 HP, +50 score)
- 🪳 Avoid cockroaches that chase you (-10 HP on contact)
- 📊 Score tracking system
- 🎯 Progressive difficulty (more cockroaches spawn over time)
- 🎨 Colorful UI with Tailwind CSS
- 🖼️ **Support for custom GIF characters** - Use your own animated images!

## 🎨 Adding Your Own GIF Characters

You can replace all game characters with your own GIF images! See [HOW_TO_ADD_GIFS.md](./HOW_TO_ADD_GIFS.md) for detailed instructions.

**Quick Start:**
1. Add your GIF files to the `public/` folder:
   - `player.gif` - Modi's face
   - `tree.gif` - Trees
   - `cockroach.gif` - Enemies
   - `powerup.gif` - Power-up stars
2. Run the game - it will automatically use your images!

If images are missing, the game falls back to emoji characters.

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play the game.

### Build for Production

```bash
npm run build
npm start
```

## Deploy on Vercel

The easiest way to deploy this game is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository on Vercel
3. Vercel will automatically detect Next.js and deploy it
4. Your game will be live in minutes!

Alternatively, you can use the Vercel CLI:

```bash
npm install -g vercel
vercel
```

## How to Play

- Use **Arrow Keys** or **WASD** to move Modi around
- Eat **trees** 🌳 to gain HP (each tree gives +20 HP, max 100)
- Collect **power stars** ⭐ that appear every 7 seconds (+50 HP, +50 score)
- Avoid **cockroaches** 🪳 that chase you (each hit takes -10 HP)
- Survive as long as possible and get the highest score!
- Game ends when your HP reaches 0

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hooks** - Game state management
- **RequestAnimationFrame** - Smooth game loop

## Game Mechanics

- Player speed: 5 pixels per frame
- Cockroach speed: 2 pixels per frame
- Canvas size: 800x600 pixels
- Initial trees: 5
- Initial cockroaches: 3
- Power star spawn: Every 7 seconds
- New cockroach spawns every 10 seconds
- Maximum cockroaches: 8

## Customization

You can easily customize the game by modifying constants in `components/Game.tsx`:

- `PLAYER_SPEED` - How fast Modi moves
- `COCKROACH_SPEED` - How fast enemies chase
- `TREE_HP_GAIN` - HP gained from eating trees
- `POWERUP_HP_GAIN` - HP gained from power stars
- `POWERUP_SPAWN_INTERVAL` - How often power stars appear (milliseconds)
- `COCKROACH_DAMAGE` - Damage taken from cockroaches
- `INITIAL_HP` - Starting health points

Enjoy the game! 🎮
