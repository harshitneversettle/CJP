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
  spawnTime?: number; // For powerup expiration
}

// Game Configuration - Only player and powerup use GIFs
const PLAYER_IMAGE = '/player.gif'; // Your character GIF
const POWERUP_IMAGE = '/powerup.gif'; // Powerup character GIF

// Audio Configuration
const BACKGROUND_MUSIC = '/background-music.mp3'; // Background music while playing
const GAME_OVER_SOUND = '/game-over.mp3'; // Sound when character dies
const POWERUP_SOUND = '/powerup.mp3'; // Sound when collecting powerup (extra points)

// Responsive canvas dimensions
const getCanvasDimensions = () => {
  if (typeof window === 'undefined') return { width: 900, height: 650 };
  
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? Math.min(window.innerWidth - 32, 400) : 900;
  const height = isMobile ? Math.min(window.innerHeight * 0.6, 500) : 650;
  
  return { width, height };
};

// Responsive sizes
const getGameSizes = () => {
  if (typeof window === 'undefined') return { player: 80, tree: 50, cockroach: 45, powerup: 70 };
  
  const isMobile = window.innerWidth < 768;
  return {
    player: isMobile ? 50 : 80,
    tree: isMobile ? 35 : 50,
    cockroach: isMobile ? 30 : 45,
    powerup: isMobile ? 45 : 70,
  };
};
const PLAYER_SPEED = 6;
const COCKROACH_SPEED_DESKTOP = 2.5;
const COCKROACH_SPEED_MOBILE_START = 1.5; // Slower start on mobile
const COCKROACH_SPEED_MOBILE_MAX = 2.8; // Max speed on mobile
const SPEED_INCREASE_INTERVAL = 15000; // Increase speed every 15 seconds
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
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 900, height: 650 });
  const [gameSizes, setGameSizes] = useState({ player: 80, tree: 50, cockroach: 45, powerup: 70 });
  const [cockroachSpeed, setCockroachSpeed] = useState(COCKROACH_SPEED_DESKTOP);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 450, y: 325 });
  const [trees, setTrees] = useState<GameObject[]>([]);
  const [cockroaches, setCockroaches] = useState<GameObject[]>([]);
  const [powerup, setPowerup] = useState<GameObject | null>(null);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const [touchControls, setTouchControls] = useState({ x: 0, y: 0 }); // For mobile touch controls
  const [isDragging, setIsDragging] = useState(false); // For drag controls
  const [playerImageError, setPlayerImageError] = useState(false);
  const [powerupImageError, setPowerupImageError] = useState(false);
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const nextIdRef = useRef(0);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);
  const powerupSoundRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(0);

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

  // Handle responsive canvas dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const dims = getCanvasDimensions();
      const sizes = getGameSizes();
      const isMobile = window.innerWidth < 768;
      
      setCanvasDimensions(dims);
      setGameSizes(sizes);
      
      // Set initial cockroach speed based on device
      if (!gameStarted) {
        setCockroachSpeed(isMobile ? COCKROACH_SPEED_MOBILE_START : COCKROACH_SPEED_DESKTOP);
        setPlayerPos({ x: dims.width / 2, y: dims.height / 2 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [gameStarted]);

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
      x: Math.random() * (canvasDimensions.width - 100) + 50,
      y: Math.random() * (canvasDimensions.height - 100) + 50,
    };
  }, [canvasDimensions]);

  // Generate corner position for cockroaches
  const getCornerPosition = useCallback((cornerIndex: number): Position => {
    const margin = 30;
    const corners = [
      { x: margin, y: margin }, // Top-left
      { x: canvasDimensions.width - margin, y: margin }, // Top-right
      { x: margin, y: canvasDimensions.height - margin }, // Bottom-left
      { x: canvasDimensions.width - margin, y: canvasDimensions.height - margin }, // Bottom-right
    ];
    return corners[cornerIndex % corners.length];
  }, [canvasDimensions]);

  // Initialize game objects
  const initializeGame = useCallback(() => {
    const isMobile = window.innerWidth < 768;
    
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setHp(INITIAL_HP);
    setPlayerPos({ x: canvasDimensions.width / 2, y: canvasDimensions.height / 2 });
    setPowerup(null);
    setTouchControls({ x: 0, y: 0 });
    setCockroachSpeed(isMobile ? COCKROACH_SPEED_MOBILE_START : COCKROACH_SPEED_DESKTOP);
    gameStartTimeRef.current = Date.now();
    
    // Create initial trees
    const initialTrees: GameObject[] = [];
    for (let i = 0; i < 6; i++) {
      initialTrees.push({
        id: nextIdRef.current++,
        position: getRandomPosition(),
      });
    }
    setTrees(initialTrees);

    // Create initial cockroaches - spawn from corners
    const initialCockroaches: GameObject[] = [];
    for (let i = 0; i < 3; i++) {
      initialCockroaches.push({
        id: nextIdRef.current++,
        position: getCornerPosition(i),
      });
    }
    setCockroaches(initialCockroaches);
  }, [getRandomPosition, getCornerPosition, canvasDimensions]);

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

  // Handle touch/mouse drag on canvas
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current || gameOver) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if touch is near player
    const distance = Math.sqrt(
      Math.pow(x - playerPos.x, 2) + Math.pow(y - playerPos.y, 2)
    );
    
    if (distance < gameSizes.player) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !canvasRef.current || gameOver) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let newX = e.clientX - rect.left;
    let newY = e.clientY - rect.top;
    
    // Keep player in bounds
    newX = Math.max(gameSizes.player / 2, Math.min(canvasDimensions.width - gameSizes.player / 2, newX));
    newY = Math.max(gameSizes.player / 2, Math.min(canvasDimensions.height - gameSizes.player / 2, newY));
    
    setPlayerPos({ x: newX, y: newY });
    e.preventDefault();
  };

  const handleCanvasPointerUp = () => {
    setIsDragging(false);
  };

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = () => {
      // Move player (only if not dragging)
      if (!isDragging) {
        setPlayerPos(prev => {
          let newX = prev.x;
          let newY = prev.y;

          // Keyboard controls
          if (keys['ArrowLeft'] || keys['a'] || keys['A']) newX -= PLAYER_SPEED;
          if (keys['ArrowRight'] || keys['d'] || keys['D']) newX += PLAYER_SPEED;
          if (keys['ArrowUp'] || keys['w'] || keys['W']) newY -= PLAYER_SPEED;
          if (keys['ArrowDown'] || keys['s'] || keys['S']) newY += PLAYER_SPEED;

          // Touch controls
          newX += touchControls.x * PLAYER_SPEED;
          newY += touchControls.y * PLAYER_SPEED;

          // Keep player in bounds
          newX = Math.max(gameSizes.player / 2, Math.min(canvasDimensions.width - gameSizes.player / 2, newX));
          newY = Math.max(gameSizes.player / 2, Math.min(canvasDimensions.height - gameSizes.player / 2, newY));

          return { x: newX, y: newY };
        });
      }

      // Move cockroaches towards player with randomness to prevent clustering
      setCockroaches(prev => {
        return prev.map(cockroach => {
          const dx = playerPos.x - cockroach.position.x;
          const dy = playerPos.y - cockroach.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0) {
            // Add random offset to prevent perfect stacking
            const randomAngle = (Math.random() - 0.5) * 0.3; // Random angle variation
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            
            // Apply rotation for randomness
            const newDx = normalizedDx * Math.cos(randomAngle) - normalizedDy * Math.sin(randomAngle);
            const newDy = normalizedDx * Math.sin(randomAngle) + normalizedDy * Math.cos(randomAngle);
            
            return {
              ...cockroach,
              position: {
                x: cockroach.position.x + newDx * cockroachSpeed,
                y: cockroach.position.y + newDy * cockroachSpeed,
              },
            };
          }
          return cockroach;
        });
      });

      // Check tree collisions
      setTrees(prev => {
        const remaining = prev.filter(tree => {
          if (checkCollision(playerPos, tree.position, gameSizes.player, gameSizes.tree)) {
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
      if (powerup && checkCollision(playerPos, powerup.position, gameSizes.player, gameSizes.powerup)) {
        setHp(h => Math.min(h + POWERUP_HP_GAIN, 100));
        setScore(s => s + 50);
        setPowerup(null);
        
        // Duck background music and play powerup sound
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.volume = 0.15; // Lower background music
        }
        
        if (powerupSoundRef.current) {
          powerupSoundRef.current.currentTime = 0;
          powerupSoundRef.current.play().catch(err => {
            console.log('Powerup sound error:', err);
          });
          
          // Restore background music volume after powerup sound
          setTimeout(() => {
            if (backgroundMusicRef.current && gameStarted && !gameOver) {
              backgroundMusicRef.current.volume = 0.5;
            }
          }, 1500); // Restore after 1.5 seconds
        }
      }

      // Check if powerup has expired (5 seconds)
      if (powerup && powerup.spawnTime) {
        const currentTime = Date.now();
        if (currentTime - powerup.spawnTime > 5000) {
          setPowerup(null);
        }
      }

      // Check cockroach collisions
      setCockroaches(prev => {
        const collided = prev.some(cockroach =>
          checkCollision(playerPos, cockroach.position, gameSizes.player, gameSizes.cockroach)
        );

        if (collided) {
          setHp(h => {
            const newHp = h - COCKROACH_DAMAGE;
            if (newHp <= 0) {
              setGameOver(true);
              setIsDragging(false);
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
  }, [gameStarted, gameOver, keys, touchControls, isDragging, playerPos, checkCollision, getRandomPosition, powerup, canvasDimensions, gameSizes, cockroachSpeed]);

  // Progressive speed increase on mobile
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return; // Only increase speed on mobile
    
    const interval = setInterval(() => {
      setCockroachSpeed(prevSpeed => {
        const newSpeed = Math.min(prevSpeed + 0.2, COCKROACH_SPEED_MOBILE_MAX);
        return newSpeed;
      });
    }, SPEED_INCREASE_INTERVAL);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

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
        spawnTime: Date.now(),
      });
    }, POWERUP_SPAWN_INTERVAL);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, getRandomPosition]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-2 sm:p-4 bg-sky-400">
      <div className="mb-3 sm:mb-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 drop-shadow-lg">
          Modi&apos;s assemble
        </h1>
        <p className="text-white text-sm sm:text-lg drop-shadow">Collect trees, avoid enemies(CJP members)!</p>
      </div>
      
      {!gameStarted && (
        <div className="text-center max-w-full px-4">
          <button
            onClick={initializeGame}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 sm:py-5 px-6 sm:px-10 rounded-xl text-xl sm:text-2xl shadow-lg transition-all"
          >
            🎮 Start Game
          </button>
          <div className="mt-6 sm:mt-8 text-white bg-black bg-opacity-50 p-4 sm:p-6 rounded-xl max-w-md shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">How to Play:</h2>
            <ul className="text-left space-y-2 text-sm sm:text-lg">
              <li>🎮 Use Arrow Keys, WASD, or Touch & Drag</li>
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
          <div className="flex gap-3 sm:gap-6 mb-3 sm:mb-6">
            <div className="bg-blue-600 px-4 sm:px-8 py-2 sm:py-3 rounded-xl shadow-lg">
              <div className="text-blue-100 text-xs sm:text-sm font-semibold">SCORE</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{score}</div>
            </div>
            <div className={`px-4 sm:px-8 py-2 sm:py-3 rounded-xl shadow-lg ${
              hp > 50 
                ? 'bg-green-600' 
                : hp > 25 
                ? 'bg-yellow-500' 
                : 'bg-red-600'
            }`}>
              <div className="text-white text-xs sm:text-sm font-semibold">HEALTH</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{hp}</div>
            </div>
          </div>

          <div className="relative">
            <div
              ref={canvasRef}
              className="relative bg-green-200 border-2 sm:border-4 border-green-800 rounded-lg shadow-xl mx-auto touch-none"
              style={{ width: canvasDimensions.width, height: canvasDimensions.height }}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
            >
            {/* Player - GIF with rounded border */}
            <div
              className="absolute transition-none z-20"
              style={{
                left: playerPos.x - gameSizes.player / 2,
                top: playerPos.y - gameSizes.player / 2,
                width: gameSizes.player,
                height: gameSizes.player,
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
            >
              {!playerImageError ? (
                <Image
                  src={PLAYER_IMAGE}
                  alt="Player"
                  width={gameSizes.player}
                  height={gameSizes.player}
                  className="w-full h-full object-cover rounded-full border-4 border-white shadow-lg pointer-events-none"
                  unoptimized
                  onError={() => setPlayerImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-orange-400 rounded-full border-4 border-white flex items-center justify-center text-3xl shadow-lg pointer-events-none">
                  😊
                </div>
              )}
            </div>

            {/* Trees - Normal emoji */}
            {trees.map(tree => (
              <div
                key={tree.id}
                className="absolute transition-none z-10 pointer-events-none"
                style={{
                  left: tree.position.x - gameSizes.tree / 2,
                  top: tree.position.y - gameSizes.tree / 2,
                  width: gameSizes.tree,
                  height: gameSizes.tree,
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
                className="absolute transition-none z-20 pointer-events-none"
                style={{
                  left: powerup.position.x - gameSizes.powerup / 2,
                  top: powerup.position.y - gameSizes.powerup / 2,
                  width: gameSizes.powerup,
                  height: gameSizes.powerup,
                }}
              >
                {!powerupImageError ? (
                  <Image
                    src={POWERUP_IMAGE}
                    alt="Powerup"
                    width={gameSizes.powerup}
                    height={gameSizes.powerup}
                    className="w-full h-full object-cover rounded-full border-4 border-yellow-300 shadow-lg"
                    unoptimized
                    onError={() => setPowerupImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-yellow-400 rounded-full border-4 border-yellow-200 flex items-center justify-center text-4xl shadow-lg">
                    ⭐
                  </div>
                )}
              </div>
            )}

            {/* Cockroaches - Normal emoji */}
            {cockroaches.map(cockroach => (
              <div
                key={cockroach.id}
                className="absolute transition-none z-10 pointer-events-none"
                style={{
                  left: cockroach.position.x - gameSizes.cockroach / 2,
                  top: cockroach.position.y - gameSizes.cockroach / 2,
                  width: gameSizes.cockroach,
                  height: gameSizes.cockroach,
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  🪳
                </div>
              </div>
            ))}

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 rounded-lg pointer-events-auto">
                <div className="text-center space-y-4 sm:space-y-6 px-4">
                  <h2 className="text-4xl sm:text-6xl font-bold text-red-500 mb-4">
                    Game Over!
                  </h2>
                  <div className="bg-white bg-opacity-20 rounded-xl p-6 sm:p-8">
                    <p className="text-gray-300 text-lg sm:text-xl mb-2">Final Score</p>
                    <p className="text-4xl sm:text-5xl text-yellow-400 font-bold">{score}</p>
                  </div>
                  <button
                    onClick={initializeGame}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl text-xl sm:text-2xl shadow-lg transition-all mt-4"
                  >
                    🔄 Play Again
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>

          <div className="mt-4 sm:mt-6 text-white text-xs sm:text-base bg-black bg-opacity-50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg text-center">
            <span className="font-semibold hidden sm:inline">Controls:</span>
            <span className="hidden sm:inline"> Arrow Keys or WASD • </span>
            <span className="md:hidden font-semibold">Touch & Drag Character • </span>
            <span className="mx-1 sm:mx-2">🌳 Trees</span> • 
            <span className="mx-1 sm:mx-2">⭐ Humara pyaara Gyanesh</span> • 
            <span className="mx-1 sm:mx-2">🪳 (Youths??)</span>
          </div>
        </>
      )}
    </div>
  );
}
