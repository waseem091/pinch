import { useState } from "react";
import { XRSession } from "./xr/XRSession";

export default function App() {
  const [started, setStarted] = useState(false);

  if (started) return <XRSession />;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000", color: "#fff", fontFamily: "monospace" }}>
      <button
        onClick={() => setStarted(true)}
        style={{ padding: "1rem 2rem", fontSize: "1.2rem", cursor: "pointer", background: "#fff", color: "#000", border: "none", borderRadius: "4px" }}
      >
        TAP TO START AR
      </button>
    </div>
  );
}
