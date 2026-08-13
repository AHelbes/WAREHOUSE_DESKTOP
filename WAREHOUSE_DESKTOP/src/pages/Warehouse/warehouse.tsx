type WarehouseProps = {
  onBack: () => void;
};

function Warehouse({ onBack }: WarehouseProps) {
  return (
    <main>
      <h1>Hello</h1>
      <button onClick={onBack}>Back to Login</button>
    </main>
  );
}

export default Warehouse;