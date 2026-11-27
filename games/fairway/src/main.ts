// Entry point. Phase 1 builds only the physics core (src/physics). The scene,
// input and game state come in phase 2 (see SPEC.md, section 11).
const statusEl = document.getElementById('status')
if (statusEl) statusEl.textContent = 'Fairway is in development.'

export {}
