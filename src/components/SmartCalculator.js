import React, { useState } from 'react';
import ModalBase from './ModalBase';
import './SmartCalculator.css';

const SmartCalculator = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [operation, setOperation] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num) => {
    if (newNumber) {
      setDisplay(String(num));
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
      setNewNumber(false);
    }
  };

  const handleOperation = (op) => {
    const current = parseFloat(display);
    
    if (previousValue === null) {
      setPreviousValue(current);
    } else if (operation) {
      const result = calculate(previousValue, current, operation);
      setPreviousValue(result);
      setDisplay(String(result));
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return a / b;
      default: return b;
    }
  };

  const handleEquals = () => {
    const current = parseFloat(display);
    if (operation && previousValue !== null) {
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setOperation(null);
    setPreviousValue(null);
    setNewNumber(true);
  };

  const calcButton = (content, type = '') => (
    <button 
      className={`calc-btn ${type}`}
      onClick={() => {
        if (typeof content === 'number') handleNumber(content);
        else if (content === '.') handleDecimal();
        else if (content === 'C') handleClear();
        else if (content === '=') handleEquals();
        else handleOperation(content);
      }}
    >
      {content}
    </button>
  );

  return (
    <ModalBase 
      isOpen={isOpen} 
      onClose={onClose}
      contentClassName="calculator-modal"
    >
      <div className="calculator">
        <div className="calc-header">
          <span>Calculadora</span>
          <button onClick={onClose} className="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="calc-display">
          <div className="previous-operation">
            {previousValue !== null ? `${previousValue} ${operation || ''}` : ''}
          </div>
          <div className="current-value">{display}</div>
        </div>
        <div className="calc-buttons">
          {calcButton('C', 'clear')}
          {calcButton('÷', 'operator')}
          {calcButton('×', 'operator')}
          {calcButton('⌫', 'backspace')}
          {calcButton(7)}
          {calcButton(8)}
          {calcButton(9)}
          {calcButton('-', 'operator')}
          {calcButton(4)}
          {calcButton(5)}
          {calcButton(6)}
          {calcButton('+', 'operator')}
          {calcButton(1)}
          {calcButton(2)}
          {calcButton(3)}
          {calcButton('=', 'equals')}
          {calcButton(0, 'zero')}
          {calcButton('.')}
        </div>
      </div>
    </ModalBase>
  );
};

export default SmartCalculator;
