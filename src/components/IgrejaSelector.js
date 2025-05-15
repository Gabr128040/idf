import React from 'react';

const IgrejaSelector = ({ igrejas, selectedIgreja, onSelect }) => {
  return (
    <div className="zz-igreja-selector">
      <label htmlFor="igreja-select" className="zz-igreja-label">Igreja</label>
      <select
        id="igreja-select"
        className="zz-igreja-select"
        value={selectedIgreja ? selectedIgreja.id : ''}
        onChange={e => onSelect(e.target.value)}
      >
        <option value="">-- Escolha --</option>
        {igrejas.map(igreja => (
          <option key={igreja.id} value={igreja.id}>
            {igreja.nome}
          </option>
        ))}
      </select>
      <style>{`
        .zz-igreja-selector { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .zz-igreja-label { font-size: 0.95rem; color: #4f8cff; font-weight: 600; margin-bottom: 2px; }
        .zz-igreja-select { border-radius: 8px; border: 1.5px solid #4f8cff; padding: 7px 12px; font-size: 1rem; background: #f7fafc; color: #2c3e50; transition: border 0.2s; box-shadow: 0 1px 4px #0001; }
        .zz-igreja-select:focus { border: 1.5px solid #357ae8; outline: none; }
      `}</style>
    </div>
  );
};

export default IgrejaSelector;
