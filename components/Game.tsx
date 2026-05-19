'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

interface Position {
  x: number;
  y: number;
}

interface GameObject {
  id: number;
  position: Position;
}

// Game Configuration - Only player and powerup use GIFs
const PLAYER_IMAGE = '/player.gif'; // Your character GIF
const POWERUP_IMAGE = '/powerup.gif'; // Powerup character GIF

// Audio Configuration
const BACKGROUND_MUSIC = '/background-music.mp3'; // Background music while playing
const GAME_OVER_SOUND = '/game-over.mp3'; // Sound when character dies
const POWERUP_SOUND = '/powerup.mp3'; // Sound when collecting powerup (extra points)

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 650;
const PLAYER_SIZE = 80; // Bigger and rounded
const TREE_SIZE = 50;
const COCKROACH_SIZE = 45;
const POWERUP_SIZE = 70; // Bigger powerup
const PLAYER_SPEED = 6;
const COCKROACH_SPEED = 2.5;
const INITIAL_HP = 100;
const TREE_HP_GAIN = 20;
const POWERUP_HP_GAIN = 50;
const COCKROACH_DAMAGE = 10;
const POWERUP_SPAWN_INTERVAL = 7000; // 7 seconds

export default function Game() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(INITIAL_HP);
  const [playerPos, setPlayerPos] = useState<Position>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const [trees, setTrees] = useState<GameObject[]>([]);
  const [cockroaches, setCockroaches] = useState<GameObject[]>([]);
  const [powerup, setPowerup] = useState<GameObject | null>(null);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const [playerImageError, setPlayerImageError] = useState(false);
  const [powerupImageError, setPowerupImageError] = useState(false);
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const nextIdRef = useRef(0);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);
  const powerupSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    backgroundMusicRef.current = new Audio(BACKGROUND_MUSIC);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.5;

    gameOverSoundRef.current = new Audio(GAME_OVER_SOUND);
    gameOverSoundRef.current.volume = 0.7;

    powerupSoundRef.current = new Audio(POWERUP_SOUND);
    powerupSoundRef.current.volume = 0.6;

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      if (gameOverSoundRef.current) {
        gameOverSoundRef.current.pause();
        gameOverSoundRef.current = null;
      }
      if (powerupSoundRef.current) {
        powerupSoundRef.current.pause();
        powerupSoundRef.current = null;
      }
    };
  }, []);

  // Handle background music
  useEffect(() => {
    if (gameStarted && !gameOver && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(err => {
        console.log('Background music autoplay prevented:', err);
      });
    } else if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
  }, [gameStarted, gameOver]);

  // Generate random position
  const getRandomPosition = useCallback((): Position => {
    return {
      x: Math.random() * (CANVAS_WIDTH - 100) + 50,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
    };
  }, []);

  // Initialize game objects
  const initializeGame = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setHp(INITIAL_HP);
    setPlayerPos({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
    setPowerup(null);
    
    // Create initial trees
    const initialTrees: GameObject[] = [];
    for (let i = 0; i < 6; i++) {
      initialTrees.push({
        id: nextIdRef.current++,
        position: getRandomPosition(),
      });
    }
    setTrees(initialTrees);

    // Create initial cockroaches
    const initialCockroaches: GameObject[] = [];
    for (let i = 0; i < 3; i++) {
      initialCockroaches.push({
        id: nextIdRef.current++,
        position: getRandomPosition(),
      });
    }
    setCockroaches(initialCockroaches);
  }, [getRandomPosition]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Check collision
  const checkCollision = useCallback((pos1: Position, pos2: Position, size1: number, size2: number): boolean => {
    return (
      Math.abs(pos1.x - pos2.x) < (size1 + size2) / 2 &&
      Math.abs(pos1.y - pos2.y) < (size1 + size2) / 2
    );
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = () => {
      // Move player
      setPlayerPos(prev => {
        let newX = prev.x;
        let newY = prev.y;

        if (keys['ArrowLeft'] || keys['a'] || keys['A']) newX -= PLAYER_SPEED;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) newX += PLAYER_SPEED;
        if (keys['ArrowUp'] || keys['w'] || keys['W']) newY -= PLAYER_SPEED;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) newY += PLAYER_SPEED;

        // Keep player in bounds
        newX = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, newX));
        newY = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, newY));

        return { x: newX, y: newY };
      });

      // Move cockroaches towards player
      setCockroaches(prev => {
        return prev.map(cockroach => {
          const dx = playerPos.x - cockroach.position.x;
          const dy = playerPos.y - cockroach.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0) {
            return {
              ...cockroach,
              position: {
                x: cockroach.position.x + (dx / distance) * COCKROACH_SPEED,
                y: cockroach.position.y + (dy / distance) * COCKROACH_SPEED,
              },
            };
          }
          return cockroach;
        });
      });

      // Check tree collisions
      setTrees(prev => {
        const remaining = prev.filter(tree => {
          if (checkCollision(playerPos, tree.position, PLAYER_SIZE, TREE_SIZE)) {
            setHp(h => Math.min(h + TREE_HP_GAIN, 100));
            setScore(s => s + 10);
            return false;
          }
          return true;
        });

        // Add new tree if one was eaten
        if (remaining.length < prev.length) {
          remaining.push({
            id: nextIdRef.current++,
            position: getRandomPosition(),
          });
        }

        return remaining;
      });

      // Check powerup collision
      if (powerup && checkCollision(playerPos, powerup.position, PLAYER_SIZE, POWERUP_SIZE)) {
        setHp(h => Math.min(h + POWERUP_HP_GAIN, 100));
        setScore(s => s + 50);
        setPowerup(null);
        // Play powerup sound
        if (powerupSoundRef.current) {
          powerupSoundRef.current.currentTime = 0;
          powerupSoundRef.current.play().catch(err => {
            console.log('Powerup sound error:', err);
          });
        }
      }

      // Check cockroach collisions
      setCockroaches(prev => {
        const collided = prev.some(cockroach =>
          checkCollision(playerPos, cockroach.position, PLAYER_SIZE, COCKROACH_SIZE)
        );

        if (collided) {
          setHp(h => {
            const newHp = h - COCKROACH_DAMAGE;
            if (newHp <= 0) {
              setGameOver(true);
              // Play game over sound
              if (gameOverSoundRef.current) {
                gameOverSoundRef.current.currentTime = 0;
                gameOverSoundRef.current.play().catch(err => {
                  console.log('Game over sound error:', err);
                });
              }
            }
            return Math.max(0, newHp);
          });
        }

        return prev;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, keys, playerPos, checkCollision, getRandomPosition, powerup]);

  // Spawn more cockroaches over time
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setCockroaches(prev => {
        if (prev.length < 8) {
          return [...prev, {
            id: nextIdRef.current++,
            position: getRandomPosition(),
          }];
        }
        return prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, getRandomPosition]);

  // Spawn powerup every 7 seconds
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setPowerup({
        id: nextIdRef.current++,
        position: getRandomPosition(),
      });
    }, POWERUP_SPAWN_INTERVAL);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, getRandomPosition]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-sky-400">
      <div className="mb-6 text-center">
        <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
          Modi&apos;s Tree Adventure
        </h1>
        <p className="text-white text-lg drop-shadow">Collect trees, avoid enemies!</p>
      </div>
      
      {!gameStarted && (
        <div className="text-center">
          <button
            onClick={initializeGame}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-5 px-10 rounded-xl text-2xl shadow-lg transition-all"
          >
            🎮 Start Game
          </button>
          <div className="mt-8 text-white bg-black bg-opacity-50 p-6 rounded-xl max-w-md shadow-lg">
            <h2 className="text-2xl font-bold mb-4">How to Play:</h2>
            <ul className="text-left space-y-2 text-lg">
              <li>🎮 Use Arrow Keys or WASD to move</li>
              <li>🌳 Eat trees to gain HP (+20)</li>
              <li>⭐ Collect power stars for extra HP (+50)</li>
              <li>🪳 Avoid cockroaches (-10 HP)</li>
              <li>🎯 Survive as long as possible!</li>
            </ul>
          </div>
        </div>
      )}

      {gameStarted && (
        <>
          <div className="flex gap-6 mb-6">
            <div className="bg-blue-600 px-8 py-3 rounded-xl shadow-lg">
              <div className="text-blue-100 text-sm font-semibold">SCORE</div>
              <div className="text-white text-3xl font-bold">{score}</div>
            </div>
            <div className={`px-8 py-3 rounded-xl shadow-lg ${
              hp > 50 
                ? 'bg-green-600' 
                : hp > 25 
                ? 'bg-yellow-500' 
                : 'bg-red-600'
            }`}>
              <div className="text-white text-sm font-semibold">HEALTH</div>
              <div className="text-white text-3xl font-bold">{hp}</div>
            </div>
          </div>

          <div
            className="relative bg-green-200 border-4 border-green-800 rounded-lg shadow-xl"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          >
            {/* Player - GIF with rounded border */}
            <div
              className="absolute transition-none z-20"
              style={{
                left: playerPos.x - PLAYER_SIZE / 2,
                top: playerPos.y - PLAYER_SIZE / 2,
                width: PLAYER_SIZE,
                height: PLAYER_SIZE,
              }}
            >
              {!playerImageError ? (
                <Image
                  src={PLAYER_IMAGE}
                  alt="Player"
                  width={PLAYER_SIZE}
                  height={PLAYER_SIZE}
                  className="w-full h-full object-cover rounded-full border-4 border-white shadow-lg"
                  unoptimized
                  onError={() => setPlayerImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-orange-400 rounded-full border-4 border-white flex items-center justify-center text-3xl shadow-lg">
                  😊
                </div>
              )}
            </div>

            {/* Trees - Normal emoji */}
            {trees.map(tree => (
              <div
                key={tree.id}
                className="absolute transition-none z-10"
                style={{
                  left: tree.position.x - TREE_SIZE / 2,
                  top: tree.position.y - TREE_SIZE / 2,
                  width: TREE_SIZE,
                  height: TREE_SIZE,
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-5xl">
                  🌳
                </div>
              </div>
            ))}

            {/* Powerup - GIF with rounded border */}
            {powerup && (
              <div
                className="absolute transition-none z-20"
                style={{
                  left: powerup.position.x - POWERUP_SIZE / 2,
                  top: powerup.position.y - POWERUP_SIZE / 2,
                  width: POWERUP_SIZE,
                  height: POWERUP_SIZE,
                }}
              >
                {!powerupImageError ? (
                  <Image
                    src={POWERUP_IMAGE}
                    alt="Powerup"
                    width={POWERUP_SIZE}
                    height={POWERUP_SIZE}
                    className="w-full h-full object-cover rounded-full border-4 border-yellow-300 shadow-lg animate-pulse"
                    unoptimized
                    onError={() => setPowerupImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-yellow-400 rounded-full border-4 border-yellow-200 flex items-center justify-center text-4xl shadow-lg animate-pulse">
                    ⭐
                  </div>
                )}
              </div>
            )}

            {/* Cockroaches - Normal emoji */}
            {cockroaches.map(cockroach => (
              <div
                key={cockroach.id}
                className="absolute transition-none z-10"
                style={{
                  left: cockroach.position.x - COCKROACH_SIZE / 2,
                  top: cockroach.position.y - COCKROACH_SIZE / 2,
                  width: COCKROACH_SIZE,
                  height: COCKROACH_SIZE,
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  🪳
                </div>
              </div>
            ))}

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
                <div className="text-center space-y-6">
                  <h2 className="text-6xl font-bold text-red-500 mb-4">
                    Game Over!
                  </h2>
                  <div className="bg-white bg-opacity-20 rounded-xl p-8">
                    <p className="text-gray-300 text-xl mb-2">Final Score</p>
                    <p className="text-5xl text-yellow-400 font-bold">{score}</p>
                  </div>
                  <button
                    onClick={initializeGame}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl text-2xl shadow-lg transition-all mt-4"
                  >
                    🔄 Play Again
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-white text-base bg-black bg-opacity-50 px-6 py-3 rounded-xl shadow-lg">
            <span className="font-semibold">Controls:</span> Arrow Keys or WASD • 
            <span className="mx-2">🌳 Trees</span> • 
            <span className="mx-2">⭐ Stars</span> • 
            <span className="mx-2">🪳 Enemies</span>
          </div>
        </>
      )}
    </div>
  );
}
