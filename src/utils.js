// utils.js
export const getTipoDisplay = (tipo) => {
  switch (tipo) {
    case 'D':
      return 'Dízimo';
    case 'O':
      return 'Oferta';
    case 'S':
      return 'Despesa';
    default:
      return 'Desconhecido';
  }
};

export const getCultoDisplay = (culto) => {
  switch (culto) {
    case 'CV':
      return 'Culto da Vitória';
    case 'EBD':
      return 'EBD';
    case 'GR':
      return 'Gratidão';
    case 'LR':
      return 'Lar';
    case 'FM':
      return 'Família';
    case 'DP':
      return 'Departamento';
    case 'OT':
      return 'Outro';
    default:
      return 'Desconhecido';
  }
};

export const getTipoDespesaDisplay = (tipoDespesa) => {
  switch (tipoDespesa) {
    case 'CT':
      return 'Conta';
    case 'IN':
      return 'Insumo';
    case 'OT':
      return 'Outro';
    default:
      return 'Desconhecido';
  }
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};