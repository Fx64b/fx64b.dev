'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    TIME_SCALE,
    GRID_SIZE,
    ROOMS,
    CORRIDORS,
    INITIAL_CHARACTERS, SVG_PATHS, FOOTPRINT_SCALE, FOOTSTEP_FADE_DURATION,
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
    const animationFrameRef = useRef<number | undefined>(0);
    const updateGameRef = useRef<() => void>(()=>{});

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

        setGameTime(prevTime => {
            const newTime = prevTime + (deltaTime / 1000) * TIME_SCALE;
            return newTime >= 24 ? newTime - 24 : newTime;
        });

        setCharacters(prevCharacters =>
            prevCharacters.map(char =>
                updateCharacter(char, currentTime, gameTime, gridRef.current),
            ),
        );

        setFootsteps(prevFootsteps =>
            prevFootsteps
                .filter(step => currentTime - step.timestamp < FOOTSTEP_FADE_DURATION)
                .map(step => ({
                    ...step,
                    opacity: 1 - (currentTime - step.timestamp) / FOOTSTEP_FADE_DURATION,
                })),
        );

        animationFrameRef.current = requestAnimationFrame(updateGame);
    }, [gameTime]);

    // Start/stop game loop
    useEffect(() => {
        updateGameRef.current = updateGame;
        animationFrameRef.current = requestAnimationFrame(updateGame);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [updateGame]);

    if (gridRef.current.length === 0) {
        return null;
    }

    const hours = Math.floor(gameTime);
    const minutes = Math.floor((gameTime % 1) * 60);

    return (
        <div className="relative h-full w-full">
            <button
                className="absolute right-2 top-2 rounded px-4 py-2 z-10"
                onClick={() => setShowDebug(!showDebug)}
            >
                Toggle Debug
            </button>

            <div className="absolute left-2 top-2 rounded bg-black text-white px-4 py-2 z-10">
                Time: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </div>

            {showDebug && (
                <div className="absolute left-2 bottom-2 rounded bg-black text-white px-4 py-2 z-10">
                    Time Block: {getCurrentTimeBlock(gameTime)}
                </div>
            )}

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
                    )),
                )}

                {/* Corridors */}
                {CORRIDORS.map((corridor) => {
                    // Calculate the corridor's bounding box
                    const x = Math.min(corridor.start.x, corridor.end.x) - corridor.width / 2;
                    const y = Math.min(corridor.start.y, corridor.end.y) - corridor.width / 2;
                    const width = Math.abs(corridor.end.x - corridor.start.x) + corridor.width;
                    const height = Math.abs(corridor.end.y - corridor.start.y) + corridor.width;

                    return (
                        <rect
                            key={corridor.id}
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill="rgba(200,200,200,0.2)"
                            stroke="rgba(0,0,0,0.1)"
                        />
                    );
                })}

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
                        transform={`translate(${step.position.x},${step.position.y})`}
                    >
                        <path
                            d={step.isLeft ? SVG_PATHS.leftFoot : SVG_PATHS.rightFoot}
                            fill="rgba(0,0,0,0.5)"
                            transform={`rotate(${step.rotation}) scale(${FOOTPRINT_SCALE})`}
                            style={{ opacity: step.opacity }}
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