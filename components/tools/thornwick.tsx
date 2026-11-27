import { GameFrame } from '@/components/game-frame'

export default function Thornwick() {
    return (
        <GameFrame
            src="/games/thornwick.html"
            title="Thornwick: castle and village builder"
            themeMessage="thornwick:theme"
        >
            Press <strong>How to play</strong> in the game for a short guide.
            Tap any building to see what it does and how well it works. The game
            keeps no saves: each visit starts a new realm.
        </GameFrame>
    )
}
