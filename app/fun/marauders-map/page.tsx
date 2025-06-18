'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    CORRIDORS,
    FLOORS,
    FOOTPRINT_SCALE,
    FOOTSTEP_FADE_DURATION,
    GRID_SIZE,
    INITIAL_CHARACTERS,
    ROOMS,
    STAIRCASES,
    SVG_PATHS,
    TIME_SCALE,
} from './constants';
import { createGrid } from './pathfinding';
import { initializeSchedule, updateCharacter } from './schedule';
import './styles.css';
import { Character, FootstepInstance } from './types';

// Pan and zoom hook
const usePanZoom = (initialViewBox = '0 0 800 1200', minZoom = 0.5, maxZoom = 3) => {
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
        if (!isPanning) {return;}

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

    // Center view on a specific position
    const centerOn = (x: number, y: number) => {
        const { width, height } = parseViewBox();
        setViewBox(`${x - width / 2} ${y - height / 2} ${width} ${height}`);
    };

    return {
        viewBox,
        svgRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleZoom,
        centerOn,
    };
};

const MaraudersMap = () => {
    const [gameTime, setGameTime] = useState<number>(5.5);
    const [characters, setCharacters] = useState<Character[]>(INITIAL_CHARACTERS);
    const [footsteps, setFootsteps] = useState<FootstepInstance[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [mapRevealed, setMapRevealed] = useState(false);
    const [charactersRevealed, setCharactersRevealed] = useState(false);
    const [visibleFloors, setVisibleFloors] = useState<string[]>(
        FLOORS.filter(f => f.visible).map(f => f.id)
    );
    const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
    const gridRef = useRef<Map<string, boolean[][]>>(new Map());
    const lastUpdateRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number | undefined>(0);

    // Use our custom pan/zoom hook
    const {
        viewBox,
        svgRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleZoom,
        centerOn,
    } = usePanZoom();

    // Initialize grid and schedule
    useEffect(() => {
        // Create grid for each floor
        FLOORS.forEach(floor => {
            gridRef.current.set(
                floor.id,
                createGrid(floor.width, floor.height, floor.id)
            );
        });

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
            prevCharacters.map(char => {
                const floorGrid = gridRef.current.get(char.currentFloorId) || [];
                return updateCharacter(char, currentTime, gameTime, floorGrid);
            })
        );

        setFootsteps(prevFootsteps =>
            prevFootsteps
                .filter(step => currentTime - step.timestamp < FOOTSTEP_FADE_DURATION)
                .map(step => ({
                    ...step,
                    opacity: 1 - (currentTime - step.timestamp) / FOOTSTEP_FADE_DURATION,
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

    // Toggle floor visibility
    const toggleFloorVisibility = (floorId: string) => {
        setVisibleFloors(prev =>
            prev.includes(floorId)
                ? prev.filter(id => id !== floorId)
                : [...prev, floorId]
        );
    };

    // Focus on a specific floor
    const focusOnFloor = (floorId: string) => {
        const floor = FLOORS.find(f => f.id === floorId);
        if (floor) {
            centerOn(floor.position.x + floor.width / 2, floor.position.y + floor.height / 2);
            setSelectedFloor(floorId);

            // Make sure this floor is visible
            if (!visibleFloors.includes(floorId)) {
                setVisibleFloors(prev => [...prev, floorId]);
            }
        }
    };

    // Show all floors
    const showAllFloors = () => {
        setVisibleFloors(FLOORS.map(f => f.id));
        setSelectedFloor(null);
        centerOn(400, 0); // Center on a middle point
    };

    if (gridRef.current.size === 0) {
        return <div>Loading...</div>;
    }

    const hours = Math.floor(gameTime);
    const minutes = Math.floor((gameTime % 1) * 60);

    // Filter rooms and corridors based on visible floors
    const visibleRooms = ROOMS.filter(room => visibleFloors.includes(room.floorId));
    const visibleCorridors = CORRIDORS.filter(corridor => visibleFloors.includes(corridor.floorId));
    const visibleStaircases = STAIRCASES.filter(
        staircase =>
            visibleFloors.includes(staircase.startFloorId) ||
            visibleFloors.includes(staircase.endFloorId)
    );
    const visibleCharacters = characters.filter(char => visibleFloors.includes(char.currentFloorId));
    const visibleFootsteps = footsteps.filter(step => visibleFloors.includes(step.floorId));

    return (
        <div className="marauders-map-container">
            {/* Parchment background */}
            <div className="parchment-background"></div>

            {/* Map controls */}
            <div className="map-controls">
                <button className="control-button" onClick={() => handleZoom(1.2)}>+</button>
                <button className="control-button" onClick={() => handleZoom(0.8)}>-</button>
                <button className="control-button" onClick={showAllFloors}>All Floors</button>
                <button className="toggle-button" onClick={() => setShowDebug(!showDebug)}>
                    {showDebug ? "Hide Debug" : "Show Debug"}
                </button>
            </div>

            {/* Floor selection panel */}
            <div className="floor-controls">
                {FLOORS.map(floor => (
                    <button
                        key={floor.id}
                        className={`floor-button ${selectedFloor === floor.id ? 'selected' : ''} ${visibleFloors.includes(floor.id) ? 'visible' : ''}`}
                        onClick={() => focusOnFloor(floor.id)}
                        onDoubleClick={() => toggleFloorVisibility(floor.id)}
                    >
                        {floor.name}
                    </button>
                ))}
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
                    {/* Floors */}
                    {FLOORS.filter(floor => visibleFloors.includes(floor.id)).map(floor => (
                        <g key={floor.id} className="floor">
                            <rect
                                x={floor.position.x}
                                y={floor.position.y}
                                width={floor.width}
                                height={floor.height}
                                className="floor-background"
                                data-floor={floor.id}
                                style={{
                                    opacity: mapRevealed ? 0.3 : 0,
                                    transition: `opacity 1s ease-in`,
                                }}
                            />
                            <text
                                x={floor.position.x + 20}
                                y={floor.position.y + 30}
                                className="floor-label"
                                style={{
                                    opacity: mapRevealed ? 1 : 0,
                                    transition: `opacity 1.5s ease-in`,
                                }}
                            >
                                {floor.name}
                            </text>
                        </g>
                    ))}

                    {/* Debug grid */}
                    {showDebug && visibleFloors.map(floorId => {
                        const floor = FLOORS.find(f => f.id === floorId);
                        const grid = gridRef.current.get(floorId);
                        if (!floor || !grid) {return null;}

                        return grid.map((row, y) =>
                            row.map((walkable, x) => (
                                <rect
                                    key={`${floorId}-${x}-${y}`}
                                    x={floor.position.x + x * GRID_SIZE}
                                    y={floor.position.y + y * GRID_SIZE}
                                    width={GRID_SIZE}
                                    height={GRID_SIZE}
                                    fill={walkable ? 'transparent' : 'rgba(255,0,0,0.2)'}
                                    stroke="rgba(0,0,0,0.1)"
                                />
                            ))
                        );
                    })}

                    {/* Staircases */}
                    {visibleStaircases.map((staircase) => {
                        // Get the floors
                        const startFloor = FLOORS.find(f => f.id === staircase.startFloorId);
                        const endFloor = FLOORS.find(f => f.id === staircase.endFloorId);

                        // Skip if either floor is not in visible floors
                        if (!startFloor || !endFloor) {return null;}

                        // Calculate absolute positions
                        const startX = startFloor.position.x + staircase.startPosition.x;
                        const startY = startFloor.position.y + staircase.startPosition.y;
                        const endX = endFloor.position.x + staircase.endPosition.x;
                        const endY = endFloor.position.y + staircase.endPosition.y;

                        // Draw a connecting line if both floors are visible
                        const isFullyVisible = visibleFloors.includes(staircase.startFloorId) &&
                            visibleFloors.includes(staircase.endFloorId);

                        return (
                            <g key={staircase.id} className="staircase">
                                {/* Start point (circle) */}
                                <circle
                                    cx={startX}
                                    cy={startY}
                                    r={staircase.width / 2}
                                    className={`staircase-node ${staircase.isSecret ? 'secret' : ''} ${staircase.isMoving ? 'moving' : ''}`}
                                    style={{
                                        opacity: mapRevealed ? 1 : 0,
                                        transition: `opacity 1.5s ease-in`,
                                    }}
                                />

                                {/* End point (circle) */}
                                <circle
                                    cx={endX}
                                    cy={endY}
                                    r={staircase.width / 2}
                                    className={`staircase-node ${staircase.isSecret ? 'secret' : ''} ${staircase.isMoving ? 'moving' : ''}`}
                                    style={{
                                        opacity: mapRevealed ? 1 : 0,
                                        transition: `opacity 1.5s ease-in`,
                                    }}
                                />

                                {/* Connecting line (if both ends are visible) */}
                                {isFullyVisible && (
                                    <line
                                        x1={startX}
                                        y1={startY}
                                        x2={endX}
                                        y2={endY}
                                        className={`staircase-line ${staircase.isSecret ? 'secret' : ''} ${staircase.isMoving ? 'moving' : ''}`}
                                        strokeDasharray={staircase.isMoving ? "10,5" : (staircase.isSecret ? "5,5" : "none")}
                                        style={{
                                            opacity: mapRevealed ? 0.6 : 0,
                                            transition: `opacity 1.5s ease-in`,
                                        }}
                                    />
                                )}

                                {/* Staircase label */}
                                <text
                                    x={startX}
                                    y={startY - staircase.width / 2 - 5}
                                    textAnchor="middle"
                                    className="staircase-label"
                                    style={{
                                        opacity: mapRevealed ? 1 : 0,
                                        transition: `opacity 1.8s ease-in`,
                                        fontSize: 10,
                                    }}
                                >
                                    {staircase.name}
                                </text>
                            </g>
                        );
                    })}

                    {/* Corridors with ink style */}
                    {visibleCorridors.map((corridor) => {
                        // Get the floor
                        const floor = FLOORS.find(f => f.id === corridor.floorId);
                        if (!floor) {return null;}

                        // Calculate the corridor's absolute positions
                        const startX = floor.position.x + corridor.start.x;
                        const startY = floor.position.y + corridor.start.y;
                        const endX = floor.position.x + corridor.end.x;
                        const endY = floor.position.y + corridor.end.y;

                        // Calculate the corridor's bounding box
                        const x = Math.min(startX, endX) - corridor.width / 2;
                        const y = Math.min(startY, endY) - corridor.width / 2;
                        const width = Math.abs(endX - startX) + corridor.width;
                        const height = Math.abs(endY - startY) + corridor.width;

                        return (
                            <g key={corridor.id}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    className={`map-corridor ${corridor.isSecret ? 'secret' : ''}`}
                                    style={{
                                        opacity: mapRevealed ? 1 : 0,
                                        transition: `opacity 1.5s ease-in ${Math.random() * 0.5 + 0.5}s`,
                                    }}
                                />
                                {corridor.name && (
                                    <text
                                        x={(startX + endX) / 2}
                                        y={(startY + endY) / 2}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="corridor-label"
                                        style={{
                                            opacity: mapRevealed ? 0.8 : 0,
                                            transition: `opacity 1.8s ease-in`,
                                            fontSize: 8,
                                        }}
                                    >
                                        {corridor.name}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Debug paths */}
                    {showDebug && visibleCharacters.map((char) => {
                        // Get the floor
                        const floor = FLOORS.find(f => f.id === char.currentFloorId);
                        if (!floor) {return null;}

                        return (
                            <g key={`debug-${char.id}`}>
                                <path
                                    d={`M ${char.path.map((p) =>
                                        `${floor.position.x + p.x},${floor.position.y + p.y}`
                                    ).join(' L ')}`}
                                    stroke="blue"
                                    strokeWidth="1"
                                    fill="none"
                                    opacity="0.5"
                                />
                                {char.targetPosition && (
                                    <circle
                                        cx={floor.position.x + char.targetPosition.x}
                                        cy={floor.position.y + char.targetPosition.y}
                                        r={3}
                                        fill="red"
                                    />
                                )}
                            </g>
                        );
                    })}

                    {/* Rooms with ink-style borders */}
                    {visibleRooms.map((room) => {
                        // Get the floor
                        const floor = FLOORS.find(f => f.id === room.floorId);
                        if (!floor) {return null;}

                        // Calculate absolute positions
                        const x = floor.position.x + room.position.x;
                        const y = floor.position.y + room.position.y;

                        return (
                            <g key={room.id}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={room.width}
                                    height={room.height}
                                    className="map-room"
                                    style={{
                                        opacity: mapRevealed ? 1 : 0,
                                        transition: `opacity 1.2s ease-in ${Math.random() * 0.3 + 0.2}s`,
                                    }}
                                />
                                <text
                                    x={x + room.width / 2}
                                    y={y + room.height / 2}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="map-text"
                                    style={{
                                        opacity: mapRevealed ? 1 : 0,
                                        transition: `opacity 1.5s ease-in ${Math.random() * 0.5 + 0.8}s`,
                                    }}
                                >
                                    {room.name}
                                </text>
                            </g>
                        );
                    })}

                    {/* Footsteps */}
                    {visibleFootsteps.map((step) => {
                        // Get the floor
                        const floor = FLOORS.find(f => f.id === step.floorId);
                        if (!floor) {return null;}

                        // Calculate absolute position
                        const x = floor.position.x + step.position.x;
                        const y = floor.position.y + step.position.y;

                        return (
                            <g
                                key={step.id}
                                transform={`translate(${x},${y})`}
                            >
                                <path
                                    d={step.isLeft ? SVG_PATHS.leftFoot : SVG_PATHS.rightFoot}
                                    className="footprint"
                                    transform={`rotate(${step.rotation}) scale(${FOOTPRINT_SCALE})`}
                                    style={{
                                        opacity: step.opacity * (charactersRevealed ? 1 : 0),
                                        transition: 'opacity 0.3s ease-in',
                                    }}
                                />
                            </g>
                        );
                    })}

                    {/* Characters with ink spreading effect */}
                    {visibleCharacters.map((char) => {
                        // Get the floor
                        const floor = FLOORS.find(f => f.id === char.currentFloorId);
                        if (!floor) {return null;}

                        // Calculate absolute position
                        const x = floor.position.x + char.position.x;
                        const y = floor.position.y + char.position.y;

                        // Set color based on character type
                        let dotColor = '#493829'; // Default brown
                        switch(char.type) {
                            case 'GRYFFINDOR':
                                dotColor = '#8B0000'; // Gryffindor red
                                break;
                            case 'SLYTHERIN':
                                dotColor = '#1A472A'; // Slytherin green
                                break;
                            case 'RAVENCLAW':
                                dotColor = '#0E1A40'; // Ravenclaw blue
                                break;
                            case 'HUFFLEPUFF':
                                dotColor = '#FFD700'; // Hufflepuff yellow/gold
                                break;
                            case 'TEACHER':
                                dotColor = '#2d1e14'; // Dark brown
                                break;
                            case 'HEADMASTER':
                                dotColor = '#702963'; // Purple for Dumbledore
                                break;
                            case 'GHOST':
                                dotColor = '#B0C4DE'; // Light blue for ghosts
                                break;
                        }

                        return (
                            <g
                                key={char.id}
                                style={{
                                    opacity: charactersRevealed ? 1 : 0,
                                    transform: `translate(${x}px, ${y}px)`,
                                    transition: 'opacity 1s ease-in, transform 0.5s ease-out',
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

            {/* Floor indicator */}
            <div className="floor-indicator">
                {selectedFloor ?
                    FLOORS.find(f => f.id === selectedFloor)?.name :
                    'All Floors'
                }
            </div>
        </div>
    );
};

export default MaraudersMap;