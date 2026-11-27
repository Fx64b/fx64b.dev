/*
 * Paints ground chunks off the main thread. Messages from ground.ts:
 * { data } sets what the painter reads (a copy of the map), { job } paints one
 * rectangle and sends back its pixels (or null when nothing is on the map there).
 */
import { paintGround, setPaintData } from './groundpaint'

const me: any = self
me.onmessage = (e?) => {
    const m = e.data
    if (m.data) {
        setPaintData(m.data)
    }
    if (m.job) {
        const j = m.job,
            im = paintGround(j.x0, j.y0, j.w, j.h)
        if (im) {
            me.postMessage({ ...j, buf: im.data.buffer }, [im.data.buffer])
        } else {
            me.postMessage({ ...j, buf: null })
        }
    }
}
