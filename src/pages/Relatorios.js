import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Relatorios.css';

const Relatorios = () => {
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/relatorios/`);
        setRelatorios(response.data);
      } catch (error) {
        setError('Erro ao buscar relatórios.');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este relatório?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/relatorios/${id}/deletar/`);
        setRelatorios((prevRelatorios) => prevRelatorios.filter((relatorio) => relatorio.id !== id));
        alert('Relatório deletado com sucesso!');
      } catch (error) {
        console.error('Erro ao deletar relatório:', error);
        alert('Erro ao deletar relatório.');
      }
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', margin: '32px 0 18px 0', color: '#4f8cff', fontWeight: 500 }}>
      Carregando relatórios...
      <div className="zz-skeleton-list">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="zz-skeleton-item" />
        ))}
      </div>
      <style>{`
        .zz-skeleton-list { margin-top: 12px; }
        .zz-skeleton-item { height: 38px; background: #e3e9f7; border-radius: 8px; margin-bottom: 8px; animation: zz-skel 1.2s infinite linear alternate; }
        @keyframes zz-skel { 0% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
  if (error) return <div style={{ color: '#e74c3c', textAlign: 'center', margin: '32px 0 18px 0', fontWeight: 500 }}>{error}</div>;
  if (!relatorios.length) return <div style={{ textAlign: 'center', marginTop: 18 }}>Nenhum relatório encontrado.</div>;

  return (
    <div className="relatorios">
      <h2>Relatórios Antigos</h2>
      <ul>
        {relatorios.map((relatorio) => (
          <li key={relatorio.id}>
            <span>{relatorio.nome} - {relatorio.mes}/{relatorio.ano}</span>
            <a href={relatorio.url} download={`relatorio_mes_${relatorio.mes}_${relatorio.ano}.pdf`}>
              Download
            </a>
            <button onClick={() => handleDelete(relatorio.id)} className="delete-button">
              Deletar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Relatorios;