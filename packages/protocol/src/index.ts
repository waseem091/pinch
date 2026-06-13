// Hand tracking types

export interface Joint {
  pos: [number, number, number];
  rot: [number, number, number, number];
}

export interface HandData {
  n: number;
  joints: (Joint | null)[];
}

export interface HandFrame {
  frame: number;
  ts: number;
  left: HandData | null;
  right: HandData | null;
}

// Bounty types

export type BountyKind = "intervention" | "training";
export type BountyStatus = "open" | "claimed" | "completed" | "cancelled";

export interface Bounty {
  id: string;
  robotId: string;
  kind: BountyKind;
  status: BountyStatus;
  reward: bigint;
  description: string;
  createdAt: number;
  claimedBy?: string;
  completedAt?: number;
}

// Job types

export type JobStatus = "pending" | "active" | "done" | "failed";

export interface Job {
  id: string;
  bountyId: string;
  operatorId: string;
  status: JobStatus;
  startedAt: number;
  endedAt?: number;
  txHash?: string;
}
