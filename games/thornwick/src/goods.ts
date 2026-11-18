/* Goods made in the village: production chains turn raw goods into better ones.
   They live in S.res next to food, wood, stone and gold, so costs can use them. */
import { ICON } from './config'

export const GOODS = [
    'iron',
    'tools',
    'weapons',
    'flour',
    'bread',
    'ale',
    'wool',
    'cloth',
]
/* name: shown in lists. one: the word after a count of 1. price: worth in gold
   when trading. col: colour of the floating number. */
export const GOOD = {
    food: { name: 'Food', one: 'food', price: 0.4, col: '#f6dc7c' },
    wood: { name: 'Wood', one: 'wood', price: 0.5, col: '#f0cfa2' },
    stone: { name: 'Stone', one: 'stone', price: 0.6, col: '#eeeee6' },
    gold: { name: 'Gold', one: 'gold', price: 1, col: '#ffd95a' },
    iron: { name: 'Iron', one: 'iron', price: 1.5, col: '#c9ccd2' },
    tools: { name: 'Tools', one: 'tool', price: 4, col: '#d8c3a0' },
    weapons: { name: 'Weapons', one: 'weapon', price: 5, col: '#dfe6ea' },
    flour: { name: 'Flour', one: 'flour', price: 0.8, col: '#f4efe2' },
    bread: { name: 'Bread', one: 'bread', price: 0.9, col: '#e8b26a' },
    ale: { name: 'Ale', one: 'ale', price: 1.4, col: '#f0c060' },
    wool: { name: 'Wool', one: 'wool', price: 1.2, col: '#f2ecdc' },
    cloth: { name: 'Cloth', one: 'cloth', price: 3, col: '#e08a7a' },
}
/** "1 weapon", "3 weapons", "12 iron". */
export const amountText = (r?, n?) =>
    n +
    ' ' +
    (n === 1 && GOOD[r]
        ? GOOD[r].one
        : GOOD[r]
          ? GOOD[r].name.toLowerCase()
          : r)
Object.assign(ICON, {
    iron: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 11.5l2.4-5h8.2l2.4 5z" fill="#7b8088" stroke="#3e4248"/><path d="M4.6 7.6h6.8" stroke="#b9bec4"/></svg>',
    tools: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 14.5l7-7" stroke="#8b5e34" stroke-width="2.2"/><path d="M7.6 2.2l5.8 5.8-2 2-5.8-5.8z" fill="#8d939a" stroke="#4a4f55"/></svg>',
    weapons:
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.8 1.6L6.4 9l.9.9 7.4-7.4z" fill="#d8dee2" stroke="#5e646a" stroke-width=".8"/><path d="M3.6 9.4l3 3M2 14l3-3" stroke="#a8760a" stroke-width="1.6"/></svg>',
    flour: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4.5c0-1.5 8-1.5 8 0l1.2 9c0 1.2-10.4 1.2-10.4 0z" fill="#efe8d6" stroke="#8a7d62"/><path d="M5 3.4l1.2-1.6M11 3.4L9.8 1.8" stroke="#8a7d62"/></svg>',
    bread: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 10.5c0-4 3.5-6 6.5-6s6.5 2 6.5 6c0 1.4-13 1.4-13 0z" fill="#c98a3c" stroke="#7a4a1a"/><path d="M5.4 6.6l1 2.2M8.4 5.8l.8 2.4M11 6.8l.4 2" stroke="#f0cf90"/></svg>',
    ale: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5h7.5v9H3z" fill="#d9a12e" stroke="#6b4a1a"/><path d="M10.5 7h2v4.6h-2" fill="none" stroke="#6b4a1a" stroke-width="1.2"/><path d="M2.6 5.4c0-2 8.4-2 8.4 0z" fill="#f6efe0" stroke="#8a7d62" stroke-width=".7"/></svg>',
    wool: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.2" cy="9" r="3.4" fill="#f2ecdc" stroke="#9a8f78"/><circle cx="10.6" cy="9" r="3.4" fill="#f2ecdc" stroke="#9a8f78"/><circle cx="8" cy="6" r="3.4" fill="#f2ecdc" stroke="#9a8f78"/></svg>',
    cloth: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h10.5v8H2z" fill="#9e3129" stroke="#5a1a14"/><path d="M12.5 4.5c1.6 0 1.6 8 0 8" fill="#c0564a" stroke="#5a1a14"/><path d="M2 7.2h10.5M2 9.8h10.5" stroke="#d27a6a" stroke-width=".7"/></svg>',
    mood: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="currentColor" opacity=".18" stroke="currentColor"/><circle cx="5.8" cy="6.6" r="1" fill="currentColor"/><circle cx="10.2" cy="6.6" r="1" fill="currentColor"/><path d="M5 9.6c1.6 2 4.4 2 6 0" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
})
