'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    TIME_SCALE,
    GRID_SIZE,
    ROOMS,
    CORRIDORS,
    INITIAL_CHARACTERS, SVG_PATHS, FOOTPRINT_SCALE, FOOTSTEP_FADE_DURATION,
} from './constants';
import { createGrid } from './pathfinding';
import { initializeSchedule, updateCharacter } from './schedule';
import { Character, FootstepInstance } from './types';
import { getCurrentTimeBlock } from './time';
import './styles.css';

// Add a custom hook for pan and zoom functionality
const usePanZoom = (initialViewBox = '0 0 800 600', minZoom = 0.5, maxZoom = 2) => {
    const [viewBox, setViewBox] = useState(initialViewBox);
    const [isPanning, setIsPanning] = useState(false);
    const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const svgRef = useRef<SVGSVGElement>(null);

    // Parse the current viewBox
    const parseViewBox = () => {
        const [x, y, width, height] = viewBox.split(' ').map(Number);
        return { x, y, width, height };
    };

    // Handle mouse down to start panning
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsPanning(true);
        setStartPoint({ x: e.clientX, y: e.clientY });
    };

    // Handle mouse move for panning
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;

        const { x, y, width, height } = parseViewBox();
        const dx = (e.clientX - startPoint.x) * (width / svgRef.current!.clientWidth);
        const dy = (e.clientY - startPoint.y) * (height / svgRef.current!.clientHeight);

        setViewBox(`${x - dx} ${y - dy} ${width} ${height}`);
        setStartPoint({ x: e.clientX, y: e.clientY });
    };

    // Handle mouse up to stop panning
    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Handle zoom in/out
    const handleZoom = (factor: number) => {
        const { x, y, width, height } = parseViewBox();
        const newZoom = Math.min(Math.max(zoom * factor, minZoom), maxZoom);
        const zoomFactor = newZoom / zoom;

        const newWidth = width / zoomFactor;
        const newHeight = height / zoomFactor;

        // Adjust center point to zoom towards center
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        const newX = centerX - newWidth / 2;
        const newY = centerY - newHeight / 2;

        setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
        setZoom(newZoom);
    };

    return {
        viewBox,
        svgRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleZoom
    };
};

const MaraudersMap = () => {
    const [gameTime, setGameTime] = useState<number>(5.5);
    const [characters, setCharacters] = useState<Character[]>(INITIAL_CHARACTERS);
    const [footsteps, setFootsteps] = useState<FootstepInstance[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [mapRevealed, setMapRevealed] = useState(false);
    const [charactersRevealed, setCharactersRevealed] = useState(false);
    const gridRef = useRef<boolean[][]>([]);
    const lastUpdateRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number | undefined>(0);

    // Use our custom pan/zoom hook
    const {
        viewBox,
        svgRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleZoom
    } = usePanZoom();

    // Initialize grid and schedule
    useEffect(() => {
        gridRef.current = createGrid(800, 600);
        initializeSchedule(setFootsteps);

        // Start the map reveal animation after a short delay
        setTimeout(() => {
            setMapRevealed(true);

            // Start revealing characters after the map unfolds
            setTimeout(() => {
                setCharactersRevealed(true);
            }, 1500);
        }, 500);
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
        <div className="marauders-map-container">
            {/* Parchment background */}
            <div className="parchment-background"></div>

            {/* Map controls */}
            <div className="map-controls">
                <button
                    className="control-button"
                    onClick={() => handleZoom(1.2)}
                >
                    +
                </button>
                <button
                    className="control-button"
                    onClick={() => handleZoom(0.8)}
                >
                    -
                </button>
                <button
                    className="toggle-button"
                    onClick={() => setShowDebug(!showDebug)}
                >
                    {showDebug ? "Hide Debug" : "Show Debug"}
                </button>
            </div>

            <div className="time-display">
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </div>

            {/* The map with unfolding animation */}
            <div className={`map-wrapper ${mapRevealed ? 'unfolded' : ''}`}>
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={viewBox}
                    className="map-svg"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
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

                    {/* Corridors with ink style */}
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
                                className="map-corridor"
                                style={{
                                    // Apply ink-spreading animation to corridors
                                    opacity: mapRevealed ? 1 : 0,
                                    transition: `opacity 1.5s ease-in ${Math.random() * 0.5 + 0.5}s`
                                }}
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

                    {/* Rooms with ink-style borders */}
                    {ROOMS.map((room) => (
                        <g key={room.id}>
                            <rect
                                x={room.position.x}
                                y={room.position.y}
                                width={room.width}
                                height={room.height}
                                className="map-room"
                                style={{
                                    // Apply ink-spreading animation to rooms
                                    opacity: mapRevealed ? 1 : 0,
                                    transition: `opacity 1.2s ease-in ${Math.random() * 0.3 + 0.2}s`
                                }}
                            />
                            <text
                                x={room.position.x + room.width / 2}
                                y={room.position.y + room.height / 2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="map-text"
                                style={{
                                    opacity: mapRevealed ? 1 : 0,
                                    transition: `opacity 1.5s ease-in ${Math.random() * 0.5 + 0.8}s`
                                }}
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
                                className="footprint"
                                transform={`rotate(${step.rotation}) scale(${FOOTPRINT_SCALE})`}
                                style={{
                                    opacity: step.opacity * (charactersRevealed ? 1 : 0),
                                    transition: 'opacity 0.3s ease-in'
                                }}
                            />
                        </g>
                    ))}

                    {/* Characters with ink spreading effect */}
                    {characters.map((char) => {
                        // Set color based on character type
                        let dotColor = '#493829'; // Default brown
                        switch(char.type) {
                            case 'STUDENT':
                                dotColor = '#8B0000'; // Gryffindor red
                                break;
                            case 'TEACHER':
                                dotColor = '#2d1e14'; // Dark brown
                                break;
                            case 'SLYTHERIN':
                                dotColor = '#1A472A'; // Slytherin green
                                break;
                            case 'RAVENCLAW':
                                dotColor = '#0E1A40'; // Ravenclaw blue
                                break;
                            case 'HEADMASTER':
                                dotColor = '#702963'; // Purple for Dumbledore
                                break;
                        }

                        return (
                            <g
                                key={char.id}
                                style={{
                                    opacity: charactersRevealed ? 1 : 0,
                                    transform: `translate(${char.position.x}px, ${char.position.y}px)`,
                                    transition: 'opacity 1s ease-in, transform 0.5s ease-out'
                                }}
                            >
                                <circle
                                    cx={0}
                                    cy={0}
                                    r={char.type === 'HEADMASTER' ? 7 : 5} // Larger dot for Dumbledore
                                    fill={dotColor}
                                    style={{
                                        filter: 'url(#ink-filter)',
                                    }}
                                />
                                <text
                                    x={0}
                                    y={-10}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="character-label"
                                >
                                    {char.name}
                                </text>
                            </g>
                        );
                    })}

                    {/* SVG filters for ink effects */}
                    <defs>
                        <filter id="ink-filter" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
                            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                            <feDisplacementMap in="blur" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                    </defs>
                </svg>
            </div>

            {/* Map activation UI */}
            <div className={`activation-overlay ${mapRevealed ? 'hidden' : ''}`}>
                <button
                    className="activation-button"
                    onClick={() => setMapRevealed(true)}
                >
                    I solemnly swear that I am up to no good
                </button>
            </div>
        </div>
    );
};

export default MaraudersMap;