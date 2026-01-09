import React, { useState, useEffect, useRef } from 'react'
import './CircuitCanvas.css'
import NMOS from './symbols/NMOS'
import PMOS from './symbols/PMOS'
import Capacitor from './symbols/Capacitor'
import Resistor from './symbols/Resistor'
import Ground from './symbols/Ground'
import VDD from './symbols/VDD'

const symbolComponents = {
  nmos: NMOS,
  pmos: PMOS,
  capacitor: Capacitor,
  resistor: Resistor,
  ground: Ground,
  vdd: VDD,
}

function CircuitCanvas({ components, wires, onDrop, onComponentMove, onComponentRotate, onWireAdd, onUndo }) {
  const [draggedComponent, setDraggedComponent] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [wireMode, setWireMode] = useState(false)
  const [straightLineMode, setStraightLineMode] = useState(false)
  const [wireStart, setWireStart] = useState(null)
  const [wireDrawing, setWireDrawing] = useState(null)
  const canvasRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const symbolType = e.dataTransfer.getData('symbolType')
    
    if (symbolType) {
      onDrop(symbolType, x - 40, y - 40) // Offset to center the symbol
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'w' || e.key === 'W') && e.shiftKey) {
        // Shift+W for straight line mode
        setWireMode(true)
        setStraightLineMode(true)
        setSelectedComponent(null)
      } else if (e.key === 'w' || e.key === 'W') {
        // W for freehand wire mode
        setWireMode(true)
        setStraightLineMode(false)
        setSelectedComponent(null)
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedComponent) {
          onComponentRotate(selectedComponent.id)
        }
      } else if (e.key === 'u' || e.key === 'U') {
        if (!e.shiftKey) {
          onUndo()
        }
      } else if (e.key === 'Escape') {
        setWireMode(false)
        setStraightLineMode(false)
        setWireStart(null)
        setWireDrawing(null)
        setSelectedComponent(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedComponent, onComponentRotate, onUndo])

  const handleComponentMouseDown = (e, component) => {
    e.stopPropagation()
    e.preventDefault()
    
    if (wireMode) {
      const rect = canvasRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      
      // Try to find the closest terminal, but allow clicking anywhere
      const terminal = findClosestTerminal(component, clickX, clickY)
      
      let wirePoint
      if (terminal) {
        // Snap to terminal if close enough
        wirePoint = {
          componentId: component.id,
          terminal: terminal.name,
          x: terminal.pos.x,
          y: terminal.pos.y
        }
      } else {
        // Use exact click position
        wirePoint = {
          componentId: component.id,
          x: clickX,
          y: clickY
        }
      }
      
      if (!wireStart) {
        setWireStart(wirePoint)
      } else {
        // Complete wire
        onWireAdd({
          from: wireStart,
          to: wirePoint
        })
        setWireStart(null)
        setWireMode(false)
      }
      return
    }

    setSelectedComponent(component)
    const rect = canvasRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left - component.x,
      y: e.clientY - rect.top - component.y,
    })
    setDraggedComponent(component)
  }

  const handleMouseMove = (e) => {
    if (draggedComponent) {
      const rect = canvasRef.current.getBoundingClientRect()
      const newX = e.clientX - rect.left - dragOffset.x
      const newY = e.clientY - rect.top - dragOffset.y
      
      // Constrain to canvas bounds
      const constrainedX = Math.max(0, Math.min(newX, rect.width - 80))
      const constrainedY = Math.max(0, Math.min(newY, rect.height - 80))
      
      onComponentMove(draggedComponent.id, constrainedX, constrainedY)
    } else if (wireMode && wireStart) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      let snapX = x
      let snapY = y
      
      // Try to snap to nearest terminal (optional)
      for (const component of components) {
        const terminal = findClosestTerminal(component, x, y)
        if (terminal && component.id !== wireStart.componentId) {
          snapX = terminal.pos.x
          snapY = terminal.pos.y
          break
        }
      }
      
      // If straight line mode, constrain to horizontal or vertical
      if (straightLineMode && wireStart) {
        const dx = Math.abs(snapX - wireStart.x)
        const dy = Math.abs(snapY - wireStart.y)
        
        if (dx > dy) {
          // Horizontal line
          snapY = wireStart.y
        } else {
          // Vertical line
          snapX = wireStart.x
        }
      }
      
      setWireDrawing({ x: snapX, y: snapY })
    }
  }

  const handleMouseUp = () => {
    setDraggedComponent(null)
  }

  const handleCanvasClick = (e) => {
    if (wireMode && e.target === canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Try to snap to nearest terminal if close
      let wirePoint = { x, y }
      
      for (const component of components) {
        const terminal = findClosestTerminal(component, x, y)
        if (terminal) {
          wirePoint = {
            componentId: component.id,
            terminal: terminal.name,
            x: terminal.pos.x,
            y: terminal.pos.y
          }
          break
        }
      }
      
      if (!wireStart) {
        // Start wire at clicked position
        setWireStart(wirePoint)
      } else {
        // Complete wire
        onWireAdd({
          from: wireStart,
          to: wirePoint
        })
        setWireStart(null)
        setWireMode(false)
      }
    }
  }

  // Get base terminal positions (before rotation) - relative to component center
  const getBaseTerminals = (componentType) => {
    let terminals = []
    
    if (componentType === 'pmos') {
      // PMOS: 3 terminals (base positions, no rotation)
      terminals = [
        { name: 'gate', x: 3, y: 38 },
        { name: 'source', x: 43, y: 3 },
        { name: 'drain', x: 43, y: 68 }
      ]
    } else if (componentType === 'nmos') {
      // NMOS: 3 terminals (base positions, no rotation)
      terminals = [
        { name: 'gate', x: 0, y: 32 },
        { name: 'drain', x: 43, y: 0 },
        { name: 'source', x: 43, y: 68 }
      ]
    } else if (componentType === 'capacitor') {
      terminals = [
        { name: 'left', x: 5, y: 40 },
        { name: 'right', x: 75, y: 40 }
      ]
    } else if (componentType === 'resistor') {
      terminals = [
        { name: 'left', x: 5, y: 40 },
        { name: 'right', x: 75, y: 40 }
      ]
    } else if (componentType === 'vdd') {
      terminals = [
        { name: 'out', x: 40, y: 75 }
      ]
    } else if (componentType === 'ground') {
      terminals = [
        { name: 'out', x: 40, y: 5 }
      ]
    }

    return terminals
  }

  // Calculate rotated terminal position for wire connections
  const getRotatedTerminalPosition = (component, terminal) => {
    const centerX = component.x + 40
    const centerY = component.y + 40
    const rotation = (component.rotation || 0) * Math.PI / 180
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    const dx = terminal.x - 40
    const dy = terminal.y - 40
    
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos
    }
  }

  // Find which terminal was clicked
  const findClosestTerminal = (component, clickX, clickY) => {
    const baseTerminals = getBaseTerminals(component.type)
    let closest = null
    let minDist = Infinity

    baseTerminals.forEach(terminal => {
      const rotatedPos = getRotatedTerminalPosition(component, terminal)
      const dist = Math.sqrt(
        Math.pow(clickX - rotatedPos.x, 2) + 
        Math.pow(clickY - rotatedPos.y, 2)
      )
      if (dist < minDist && dist < 30) { // 30px threshold
        minDist = dist
        closest = { ...terminal, pos: rotatedPos }
      }
    })

    return closest
  }

  const getRotationStyle = (rotation) => {
    return {
      transform: `rotate(${rotation || 0}deg)`,
      transformOrigin: 'center center',
    }
  }

  return (
    <div
      ref={canvasRef}
      className="circuit-canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* SVG for wires */}
      <svg className="wires-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Existing wires */}
        {wires.map((wire) => (
          <line
            key={wire.id}
            x1={wire.from.x}
            y1={wire.from.y}
            x2={wire.to.x}
            y2={wire.to.y}
            stroke="blue"
            strokeWidth="3"
          />
        ))}
        {/* Drawing wire */}
        {wireMode && wireStart && wireDrawing && (
          <line
            x1={wireStart.x}
            y1={wireStart.y}
            x2={wireDrawing.x}
            y2={wireDrawing.y}
            stroke="#000"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}
      </svg>

      {/* Terminal indicators in wire mode - rendered inside components so they rotate together */}
      {wireMode && components.map((component) => {
        const baseTerminals = getBaseTerminals(component.type)
        return baseTerminals.map((terminal, idx) => {
          const rotatedPos = getRotatedTerminalPosition(component, terminal)
          return (
            <div
              key={`${component.id}-${idx}`}
              className="terminal-indicator"
              style={{
                position: 'absolute',
                left: `${rotatedPos.x - 5}px`,
                top: `${rotatedPos.y - 5}px`,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#0066ff',
                border: '2px solid white',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          )
        })
      })}

      {/* Components */}
      {components.map((component) => {
        const SymbolComponent = symbolComponents[component.type]
        if (!SymbolComponent) return null

        const isSelected = selectedComponent?.id === component.id

        return (
          <div
            key={component.id}
            className={`canvas-component ${isSelected ? 'selected' : ''}`}
            style={{
              position: 'absolute',
              left: `${component.x}px`,
              top: `${component.y}px`,
              cursor: wireMode ? 'crosshair' : 'move',
              ...getRotationStyle(component.rotation),
            }}
            onMouseDown={(e) => handleComponentMouseDown(e, component)}
          >
            <SymbolComponent />
          </div>
        )
      })}

      {/* Wire mode indicator */}
      {wireMode && (
        <div className="wire-mode-indicator">
          {straightLineMode 
            ? 'Straight Line Mode (Shift+W) - Click anywhere to start/end wires. Press Escape to cancel.'
            : 'Wire Mode (W) - Click anywhere to start/end wires. Press Escape to cancel.'}
        </div>
      )}
    </div>
  )
}

export default CircuitCanvas

