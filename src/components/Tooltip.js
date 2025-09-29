import React, { useState, useRef, useEffect } from 'react';
import './Tooltip.css';

const Tooltip = ({ text, children, position = 'top', delay = 100 }) => {
  const [visible, setVisible] = useState(false);
  const touchTimer = useRef(null);

  useEffect(() => {
    return () => { if (touchTimer.current) clearTimeout(touchTimer.current); };
  }, []);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const onTouchStart = () => {
    show();
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => hide(), 2000);
  };

  return (
    <span className="tooltip-wrapper" onMouseEnter={() => setTimeout(show, delay)} onMouseLeave={hide} onTouchStart={onTouchStart} onTouchEnd={hide}>
      {children}
      {visible && (
        <span className={`tooltip-bubble tooltip-${position}`} role="status" aria-live="polite">{text}</span>
      )}
    </span>
  );
};

export default Tooltip;
