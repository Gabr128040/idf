import React, { useEffect, useState } from 'react';

const RelatorioList = ({ igrejaId }) => {
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!igrejaId) return;
    setLoading(true);
    fetch(`/api/igrejas/${igrejaId}/relatorios/`)
      .then(res => res.json())
      .then(data => {
        setRelatorios(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar relatórios.');
        setLoading(false);
      });
  }, [igrejaId]);

  if (loading) return (
    <div style={{ textAlign: 'center', margin: '24px 0 18px 0', color: '#4f8cff', fontWeight: 500 }}>
      Carregando relatórios...
      <div className="zz-skeleton-list">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="zz-skeleton-item" />
        ))}
      </div>
      <style>{`
        .zz-skeleton-list { margin-top: 12px; }
        .zz-skeleton-item { height: 28px; background: #e3e9f7; border-radius: 8px; margin-bottom: 8px; animation: zz-skel 1.2s infinite linear alternate; }
        @keyframes zz-skel { 0% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
  if (error) return <div style={{ color: '#e74c3c', textAlign: 'center', margin: '24px 0 18px 0', fontWeight: 500 }}>{error}</div>;
  if (!relatorios.length) return <div style={{ textAlign: 'center', marginTop: 18 }}>Nenhum relatório encontrado.</div>;

  return (
    <div className="zz-relatorio-list">
      <h3 className="zz-relatorio-title">Relatórios</h3>
      <ul className="zz-relatorio-ul">
        {relatorios.map(r => (
          <li className="zz-relatorio-li" key={r.id}>{r.titulo || r.nome || `Relatório #${r.id}`}</li>
        ))}
      </ul>
      <style>{`
        .zz-relatorio-list { margin-top: 18px; }
        .zz-relatorio-title { color: #4f8cff; font-size: 1.05rem; font-weight: 600; margin-bottom: 8px; }
        .zz-relatorio-ul { list-style: none; padding: 0; margin: 0; }
        .zz-relatorio-li { background: #f7fafc; border-radius: 8px; margin-bottom: 8px; padding: 8px 14px; box-shadow: 0 1px 4px #0001; color: #333; font-size: 1rem; transition: background 0.2s; }
        .zz-relatorio-li:hover { background: #e3e9f7; }
      `}</style>
    </div>
  );
};

export default RelatorioList;
