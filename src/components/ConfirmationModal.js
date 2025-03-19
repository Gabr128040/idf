import React from 'react';
//import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <p>{message}</p>
        <button onClick={onConfirm}>Sim</button>
        <button onClick={onClose}>Não</button>
      </div>
    </div>
  );
};

export default ConfirmationModal;