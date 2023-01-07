import Head from 'next/head'
import { useEffect, useState } from 'react';

export default function Home() {
    // Declare a new state variable
    const [state, setState] = useState('.');

    useEffect(() => {
      // Set an interval to update the state every 1000 milliseconds (1 second)
      const interval = setInterval(() => {
        setState(prevState => prevState === '.' ? '..' : prevState === '..' ? '...' : '.');
      }, 1000);
  
      // Return a cleanup function to stop the interval when the component unmounts
      return () => clearInterval(interval);
    }, []); // The empty array as a second argument causes this effect to only run once
  

  return (
    <>
      <Head>
        <title>Create Next App</title>
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
