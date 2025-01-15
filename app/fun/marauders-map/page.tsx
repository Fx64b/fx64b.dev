'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    GAME_SPEED,
    TIME_SCALE,
    GRID_SIZE,
    ROOMS,
    INITIAL_CHARACTERS,
} from './constants'
import { createGrid } from './pathfinding';
import { initializeSchedule, updateCharacter } from './schedule'
import { Character, FootstepInstance } from './types';
import { getCurrentTimeBlock } from './time'

const MaraudersMap = () => {
    const [gameTime, setGameTime] = useState<number>(0);
    const [characters, setCharacters] = useState<Character[]>(INITIAL_CHARACTERS);
    const [footsteps, setFootsteps] = useState<FootstepInstance[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const gridRef = useRef<boolean[][]>([]);
    const lastUpdateRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number>(0);

    // Initialize grid and schedule
    useEffect(() => {
        gridRef.current = createGrid(800, 600);
        initializeSchedule(setFootsteps);
    }, []);

    // Game update logic
    const updateGame = useCallback(() => {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastUpdateRef.current;
        lastUpdateRef.current = currentTime;

        // Update game time (6 minutes real time = 24 hours game time)
        setGameTime(prevTime => {
            const newTime = prevTime + (deltaTime / 1000) * TIME_SCALE;
            return newTime >= 24 ? newTime - 24 : newTime;
        });

        // Update characters
        setCharacters(prevCharacters =>
            prevCharacters.map(char =>
                updateCharacter(char, currentTime, gameTime, gridRef.current)
            )
        );

        // Update footsteps opacity and cleanup
        setFootsteps(prevFootsteps =>
            prevFootsteps
                .filter(step => currentTime - step.timestamp < 3000)
                .map(step => ({
                    ...step,
                    opacity: 1 - (currentTime - step.timestamp) / 3000,
                }))
        );

        animationFrameRef.current = requestAnimationFrame(updateGame);
    }, [gameTime]);

    // Start/stop game loop
    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(updateGame);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [updateGame]);

    // Wait for grid initialization
    if (gridRef.current.length === 0) {
        return null;
    }

    const hours = Math.floor(gameTime);
    const minutes = Math.floor((gameTime % 1) * 60);

    return (
        <div className="relative h-full w-full">
            {/* Debug toggle */}
            <button
                className="absolute right-2 top-2 rounded px-4 py-2 z-10"
                onClick={() => setShowDebug(!showDebug)}
            >
                Toggle Debug
            </button>

            {/* Game time display */}
            <div className="absolute left-2 top-2 rounded bg-black text-white px-4 py-2 z-10">
                Time: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </div>

            {/* Current schedule display */}
            {showDebug && (
                <div className="absolute left-2 bottom-2 rounded bg-black text-white px-4 py-2 z-10">
                    Time Block: {getCurrentTimeBlock(gameTime)}
                </div>
            )}

            {/* Main map */}
            <svg width="800" height="600" className="bg-white">
                {/* Debug grid */}
                {showDebug && gridRef.current.map((row, y) =>
                    row.map((walkable, x) => (
                        <rect
                            key={`${x}-${y}`}
                            x={x * GRID_SIZE}
                            y={y * GRID_SIZE}
                            width={GRID_SIZE}
                            height={GRID_SIZE}
                            fill={walkable ? 'transparent' : 'rgba(255,0,0,0.2)'}
                            stroke="rgba(0,0,0,0.1)"
                        />
                    ))
                )}

                {/* Debug paths */}
                {showDebug && characters.map((char) => (
                    <g key={`debug-${char.id}`}>
                        <path
                            d={`M ${char.path.map((p) => `${p.x},${p.y}`).join(' L ')}`}
                            stroke="blue"
                            strokeWidth="1"
                            fill="none"
                            opacity="0.5"
                        />
                        {char.targetPosition && (
                            <circle
                                cx={char.targetPosition.x}
                                cy={char.targetPosition.y}
                                r={3}
                                fill="red"
                            />
                        )}
                    </g>
                ))}

                {/* Rooms */}
                {ROOMS.map((room) => (
                    <g key={room.id}>
                        <rect
                            x={room.position.x}
                            y={room.position.y}
                            width={room.width}
                            height={room.height}
                            fill="none"
                            stroke="black"
                            strokeWidth="2"
                        />
                        <text
                            x={room.position.x + room.width / 2}
                            y={room.position.y + room.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="select-none"
                        >
                            {room.name}
                        </text>
                    </g>
                ))}

                {/* Footsteps */}
                {footsteps.map((step) => (
                    <g
                        key={step.id}
                        transform={`translate(${step.position.x},${step.position.y}) rotate(${step.rotation}) scale(0.02)`}
                        opacity={step.opacity}
                    >
                        <path
                            d={step.isLeft
                                ? 'M75.071,37.994c-85.775,27.432-91.109,189.36-50.785,282.24l136.988-10.244c0,0,18.469-81.1,17.828-160.524 C178.753,106.136,154.083,12.727,75.071,37.994z M29.257,356.393c0,0-4.604,131.482,87.014,121.318c81.18-9.006,49.805-135.703,49.805-135.703L29.257,356.393z'
                                : 'M436.927,37.994c-79.01-25.268-103.68,68.142-104.03,111.472c-0.642,79.425,17.828,160.524,17.828,160.524l136.986,10.244C528.038,227.354,522.704,65.426,436.927,37.994z M345.925,342.008c0,0-31.375,126.697,49.803,135.703c91.619,10.164,87.016-121.318,87.016-121.318L345.925,342.008z'
                            }
                            fill="black"
                        />
                    </g>
                ))}

                {/* Characters */}
                {characters.map((char) => (
                    <g key={char.id}>
                        <circle
                            cx={char.position.x}
                            cy={char.position.y}
                            r={5}
                            fill={char.type === 'STUDENT' ? 'blue' : 'red'}
                        />
                        <text
                            x={char.position.x}
                            y={char.position.y - 10}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="select-none"
                            fontSize="12"
                        >
                            {char.name}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    )
}

export default MaraudersMap