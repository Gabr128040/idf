import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirmation-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && onClose()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.div
            className="confirmation-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="confirmation-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="confirmation-content">
              <h3 className="confirmation-title">Confirmar Exclusão</h3>
              <p className="confirmation-message">{message}</p>
            </div>
            <div className="confirmation-actions">
              <button 
                className="btn-cancel" 
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button 
                className="btn-confirm" 
                onClick={onConfirm}
                type="button"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;