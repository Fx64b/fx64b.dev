import { GameFrame } from '@/components/game-frame'

export default function Fairway() {
    return (
        <GameFrame src="/games/fairway.html" title="Fairway: a daily golf hole">
            A new full-size hole every day. Hold Space or the swing pad and
            release to hit; the longer you hold, the further the ball flies.
            Read the wind, the lie and the green. Your first round of the day
            counts and stays in this browser; play past holes from the{' '}
            <strong>Archive</strong>.
        </GameFrame>
    )
}
