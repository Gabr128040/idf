import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Relatorios.css';

const Relatorios = () => {
  const [relatorios, setRelatorios] = useState([]);

  useEffect(() => {
    const fetchRelatorios = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/relatorios/`);
        setRelatorios(response.data);
      } catch (error) {
        console.error('Erro ao buscar relatórios:', error);
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