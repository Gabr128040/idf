import React from 'react';
import './PdfGenerationAnimation.css';

const PdfGenerationAnimation = ({ visible = false }) => {
  if (!visible) return null;
  
  return (
    <div className="pdf-generation-overlay">
      <div className="pdf-generation-content">
        <div className="pdf-animation">
          <div className="pdf-page">
            <div className="math-symbols">
              <span>+</span>
              <span>−</span>
              <span>×</span>
              <span>÷</span>
              <span>=</span>
              <span>Σ</span>
            </div>
            <div className="lines">
              <div className="line"></div>
              <div className="line"></div>
              <div className="line"></div>
            </div>
          </div>
          <div className="calculation-particles">
            <span>+</span>
            <span>−</span>
            <span>×</span>
            <span>$</span>
            <span>%</span>
          </div>
        </div>
        <p className="generation-text">Gerando relatório...</p>
      </div>
    </div>
  );

  return (
    <div className="pdf-generation-overlay">
      <div className="pdf-generation-content">
        <div className="pdf-animation">
          <div className="pdf-page">
            <div className="math-symbols">
              <span>+</span>
              <span>−</span>
              <span>×</span>
              <span>÷</span>
              <span>=</span>
              <span>Σ</span>
            </div>
            <div className="lines">
              <div className="line"></div>
              <div className="line"></div>
              <div className="line"></div>
            </div>
          </div>
          <div className="calculation-particles">
            <span>+</span>
            <span>−</span>
            <span>×</span>
            <span>$</span>
            <span>%</span>
          </div>
        </div>
        <p className="generation-text">Gerando relatório...</p>
      </div>
    </div>
  );
};

export default PdfGenerationAnimation;