import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import './Notification.css';

const Notification = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Desaparece após 3 segundos

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      className={`notification ${type}`}
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.3 }}
    >
      <span>{message}</span>
      <button onClick={onClose} className="notification-close">
        ×
      </button>
    </motion.div>
  );
};

export default Notification;