import React, { useEffect } from 'react'
import { initScene } from './oasis'


const Game: React.FC = () => {
  useEffect(() => {
    initScene()
  }, [])
  // return <canvas id="canvas" style={{ width: 1280 / 720 * 500 + 'px', height: '500px' }}></canvas>
  return <canvas id="canvas" style={{ width: '100vw', height: '100vh' }}></canvas>
}

export default Game
