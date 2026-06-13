import type { Bounty } from "@pinch/protocol";

// TODO: fetch from API
const mockBounties: Bounty[] = [
  {
    id: "1",
    robotId: "spot-01",
    kind: "intervention",
    status: "open",
    reward: BigInt("1000000000000000000"),
    description: "Robot stuck at door — needs human to open latch",
    createdAt: Date.now(),
  },
];

export default function BountiesPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Open Bounties</h1>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
        {mockBounties.map((b) => (
          <li key={b.id} style={{ border: "1px solid #333", padding: "1rem", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{b.description}</span>
              <span style={{ color: "#0f0" }}>{(Number(b.reward) / 1e18).toFixed(4)} ETH</span>
            </div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#666" }}>
              {b.robotId} · {b.kind}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
