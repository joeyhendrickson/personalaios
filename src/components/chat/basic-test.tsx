'use client'

import { useState } from 'react'

export function BasicTest() {
  const [count, setCount] = useState(0)

  const handleClick = () => {
    console.log('Basic test button clicked!')
    setCount(count + 1)
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-red-500 text-white p-4 rounded-lg">
      <h3>Basic Test</h3>
      <p>Count: {count}</p>
      <button onClick={handleClick} className="bg-white text-red-500 px-3 py-1 rounded mt-2">
        Click Me
      </button>
    </div>
  )
}
