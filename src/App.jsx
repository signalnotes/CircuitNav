import React, { useState, useCallback, useRef, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import SymbolPalette from './components/SymbolPalette'
import CircuitCanvas from './components/CircuitCanvas'

function App() {
  const [components, setComponents] = useState([])
  const [wires, setWires] = useState([])
  const [history, setHistory] = useState([])
  const componentsRef = useRef(components)
  const wiresRef = useRef(wires)

  useEffect(() => {
    componentsRef.current = components
  }, [components])

  useEffect(() => {
    wiresRef.current = wires
  }, [wires])

  const saveState = useCallback(() => {
    setHistory(prev => [...prev, { 
      components: [...componentsRef.current], 
      wires: [...wiresRef.current] 
    }].slice(-50))
  }, [])

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.length > 0) {
        const previousState = prev[prev.length - 1]
        setComponents(previousState.components)
        setWires(previousState.wires)
        return prev.slice(0, -1)
      }
      return prev
    })
  }, [])

  const handleDrop = (symbolType, x, y) => {
    saveState()
    const newComponent = {
      id: Date.now(),
      type: symbolType,
      x: x,
      y: y,
      rotation: 0,
    }
    setComponents(prev => [...prev, newComponent])
  }

  const handleComponentMove = (id, x, y) => {
    setComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, x, y } : comp
    ))
  }

  const handleComponentRotate = (id) => {
    saveState()
    setComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, rotation: (comp.rotation || 0) + 90 } : comp
    ))
  }

  const handleWireAdd = (wire) => {
    saveState()
    setWires(prev => [...prev, { ...wire, id: Date.now() }])
  }

  return (
    <div className="app">
      <Header />
      <div className="main-container">
        <SymbolPalette />
        <CircuitCanvas 
          components={components}
          wires={wires}
          onDrop={handleDrop}
          onComponentMove={handleComponentMove}
          onComponentRotate={handleComponentRotate}
          onWireAdd={handleWireAdd}
          onUndo={handleUndo}
        />
      </div>
    </div>
  )
}

export default App

