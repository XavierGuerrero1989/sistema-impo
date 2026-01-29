import { useEffect } from "react";
import { testDB } from "../offline/testDb";

function App() {
  useEffect(() => {
    testDB();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Sistema de Importaciones</h1>
      <p>Base offline lista</p>
    </div>
  );
}

export default App;
