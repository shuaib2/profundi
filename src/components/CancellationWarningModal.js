import React from 'react';
import './CancellationWarningModal.css';

function CancellationWarningModal({ onClose, onConfirm, warningMessage }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Warning</h2>
        <p>{warningMessage}</p>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn btn-confirm" onClick={onConfirm}>Proceed</button>
        </div>
      </div>
    </div>
  );
}

export default CancellationWarningModal;
