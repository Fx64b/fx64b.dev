import { TimeBlock } from './types';

export const getCurrentTimeBlock = (gameTime: number): TimeBlock => {
    const hour = gameTime;
    if (hour >= 22 || hour < 6) return hour >= 22 ? 'NIGHT1' : 'NIGHT2';
    if (hour >= 6 && hour < 10) return 'MORNING';
    if (hour >= 10 && hour < 14) return 'NOON';
    if (hour >= 14 && hour < 18) return 'AFTERNOON';
    return 'EVENING';
};