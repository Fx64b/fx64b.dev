import type { Detection } from './cv-pipeline'
import type { PageSettings } from './types'

type Req<T extends string, P = object> = { id: number; type: T } & P

export type WorkerRequest =
    | Req<'init'>
    | Req<'detect', { source: Blob | ImageBitmap; maxSide: number }>
    | Req<
          'process',
          {
              pageId: string
              blob: Blob
              settings: PageSettings
              /** Longest side to decode the source photo at. */
              sourceMaxSide: number
              /** Longest side of the flattened output. */
              maxSide: number
              format: 'image/jpeg' | 'image/png'
              quality: number
          }
      >
    | Req<'forget', { pageId: string }>

export type WorkerResponse =
    | Req<'init'>
    | Req<'detect', Detection>
    | Req<'process', { blob: Blob; width: number; height: number }>
    | Req<'forget'>
    | Req<'error', { message: string }>
