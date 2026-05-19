# How to Add Your Character GIFs and Audio

Follow these simple steps to customize your game with GIFs and audio files.

## Step 1: Prepare Your Files

### GIF Files (2 required):
1. **player.gif** - Your main character (displayed as a large rounded circle)
2. **powerup.gif** - Special power-up character (also displayed as a rounded circle)

### Audio Files (3 optional):
1. **background-music.mp3** - Background music that plays during the game
2. **game-over.mp3** - Sound effect that plays when the character dies
3. **powerup.mp3** - Sound effect that plays when collecting powerup (extra points)

## Step 2: Add Files to the Public Folder

1. Navigate to the `modi-game/public/` folder
2. Copy your files into this folder
3. Name them exactly:
   - `player.gif`
   - `powerup.gif`
   - `background-music.mp3` (optional)
   - `game-over.mp3` (optional)
   - `powerup.mp3` (optional)

## Step 3: Run the Game

```bash
cd modi-game
npm run dev
```

Your GIFs and audio will work automatically!

## Audio Behavior

### Background Music:
- **Starts**: When you click "Start Game"
- **Loops**: Plays continuously during gameplay
- **Stops**: When game is over or paused
- **Volume**: Set to 50% by default

### Game Over Sound:
- **Plays**: When cockroaches kill your character (HP reaches 0)
- **Volume**: Set to 70% by default
- **Does not loop**: Plays once per death

### Powerup Sound:
- **Plays**: When you collect a powerup star (gains extra points +50)
- **Volume**: Set to 60% by default
- **Does not loop**: Plays once per collection

## Visual Design

- **Player Character**: 80x80 pixels, rounded full circle with white border
- **Powerup Character**: 70x70 pixels, rounded circle with yellow border and pulse animation
- **Trees**: Normal emoji 🌳 (no GIF needed)
- **Cockroaches**: Normal emoji 🪳 (no GIF needed)
- **Clean design**: No gradients, simple and clear

## Customizing Paths (Optional)

If you want to use different filenames, edit these constants at the top of `components/Game.tsx`:

```typescript
const PLAYER_IMAGE = '/player.gif';
const POWERUP_IMAGE = '/powerup.gif';
const BACKGROUND_MUSIC = '/background-music.mp3';
const GAME_OVER_SOUND = '/game-over.mp3';
const POWERUP_SOUND = '/powerup.mp3';
```

## Customizing Audio Volume (Optional)

In `components/Game.tsx`, find these lines and adjust the volume (0.0 to 1.0):

```typescript
backgroundMusicRef.current.volume = 0.5; // 50% volume
gameOverSoundRef.current.volume = 0.7; // 70% volume
powerupSoundRef.current.volume = 0.6; // 60% volume
```

## Tips for Best Results

### For GIFs:
- **Recommended size**: 80x80 to 150x150 pixels
- **File format**: GIF (animated or static)
- **Background**: Transparent backgrounds work best
- **File size**: Keep under 1MB for performance
- **Aspect ratio**: Square (1:1) for perfect circles

### For Audio:
- **Format**: MP3 (most compatible)
- **Background music**: 1-3 minutes, loopable
- **Game over sound**: 1-5 seconds, short and impactful
- **Powerup sound**: 0.5-2 seconds, cheerful and rewarding
- **File size**: Keep background music under 5MB, sound effects under 500KB
- **Quality**: 128-192 kbps is sufficient

## Troubleshooting

### GIFs not showing?
- Check files are in `public/` folder
- Verify exact file names: `player.gif` and `powerup.gif`
- Ensure valid GIF format
- Clear browser cache (Ctrl+F5)

### Audio not playing?
- Check files are in `public/` folder
- Verify exact file names: `background-music.mp3`, `game-over.mp3`, and `powerup.mp3`
- Ensure valid MP3 format
- **Note**: Some browsers block autoplay - click anywhere on the page first
- Check browser console for errors
- Try different audio files to test

### Audio plays but sounds wrong?
- Adjust volume in the code (see "Customizing Audio Volume" above)
- Check your audio file isn't corrupted
- Try converting to MP3 if using different format

## Browser Autoplay Policy

Modern browsers may block audio autoplay. If background music doesn't start:
1. Click anywhere on the page after starting the game
2. Or add a "Click to Enable Sound" button
3. This is a browser security feature, not a bug

Enjoy your customized game! 🎮🎵
