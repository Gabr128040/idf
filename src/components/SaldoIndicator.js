import './SaldoIndicator.css';

const SaldoIndicator = ({ saldo }) => {
  return (
    <div className="saldo-indicator">
      <h3>Saldo Atual: R$ {saldo.toFixed(2)}</h3>
    </div>
  );
};

export default SaldoIndicator;

