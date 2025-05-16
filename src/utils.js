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
    // const [year, month, day] = dateString.split('-'); // Divide "2025-02-03" em ["2025", "02", "03"]
    const [, month, day] = dateString.split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}`; // Retorna "03/02"
};

export function truncateToTwoDecimals(value) {
  return Number(value).toFixed(2);
}

export function getLastDayOfMonth(year, month) {
  // month: 1-12
  return new Date(year, month, 0).toISOString().split('T')[0];
}