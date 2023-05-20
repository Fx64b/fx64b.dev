import Head from 'next/head'
import { useEffect, useState } from 'react';

export default function Home() {
    const [state, setState] = useState('.');

    useEffect(() => {
      const interval = setInterval(() => {
        setState(prevState => prevState === '.' ? '..' : prevState === '..' ? '...' : '.');
      }, 1000);
      return () => clearInterval(interval);
    }, []); 
  

  return (
    <>
      <Head>
        <title>Fx64b</title>
        <meta name="description" content="Fx64b.dev website" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className='w-screen h-screen bg-black flex justify-center items-center'>
        <div className="text-white text-3xl">
          <div>Work in Progress</div>
          <div className='text-4xl text-center'>{state}</div>
        </div>
      </main>
    </>
  )
}
