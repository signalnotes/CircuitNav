import React from 'react'
import './SymbolPalette.css'
import NMOS from './symbols/NMOS'
import PMOS from './symbols/PMOS'
import Capacitor from './symbols/Capacitor'
import Resistor from './symbols/Resistor'
import Ground from './symbols/Ground'
import VDD from './symbols/VDD'

function SymbolPalette() {
  const symbols = [
    { type: 'nmos', component: NMOS, label: 'NMOS' },
    { type: 'pmos', component: PMOS, label: 'PMOS' },
    { type: 'capacitor', component: Capacitor, label: 'Capacitor' },
    { type: 'resistor', component: Resistor, label: 'Resistor' },
    { type: 'ground', component: Ground, label: 'Ground' },
    { type: 'vdd', component: VDD, label: 'VDD' },
  ]

  const handleDragStart = (e, symbolType) => {
    e.dataTransfer.setData('symbolType', symbolType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="symbol-palette">
      {symbols.map((symbol) => {
        const SymbolComponent = symbol.component
        return (
          <div
            key={symbol.type}
            className="symbol-item"
            draggable
            onDragStart={(e) => handleDragStart(e, symbol.type)}
          >
            <div className="symbol-content">
              <SymbolComponent />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SymbolPalette

