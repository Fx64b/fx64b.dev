'use client'

export function BackgroundGrid() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            <div
                className="absolute inset-0 opacity-50"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
                    backgroundSize: '50px 50px',
                    maskImage: `
            radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,1) 100%)
          `,
                    WebkitMaskImage: `
            radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,1) 100%)
          `,
                }}
            />
            {/*
            <div
                className="absolute top-20 right-20 w-96 h-96 rounded-full opacity-[0.15] blur-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent animate-pulse"
                style={{ animationDuration: "4s" }}
            />

            <div
                className="absolute bottom-32 left-32 w-80 h-80 rounded-full opacity-[0.12] blur-2xl bg-gradient-to-tr from-cyan-500/15 via-blue-500/8 to-transparent animate-pulse"
                style={{ animationDuration: "6s", animationDelay: "2s" }}
            />

            <div
                className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-[0.08] blur-3xl bg-gradient-to-r from-indigo-500/12 to-transparent animate-pulse"
                style={{ animationDuration: "8s", animationDelay: "4s" }}
            />
*/}
            {/* Edge enhancement lines */}
            <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>
    )
}
