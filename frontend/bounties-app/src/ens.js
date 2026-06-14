/**
 * ENS utilities for Pinch Bounties
 *
 * resolveWalletEns  — mainnet reverse lookup: 0x… → alice.eth
 * resolveRobotEns   — Sepolia text record lookup for a robot agent subname
 */

import { createPublicClient, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

const mainnetClient = createPublicClient({
  chain:     mainnet,
  transport: http('https://cloudflare-eth.com'),
});

const sepoliaClient = createPublicClient({
  chain:     sepolia,
  transport: http('https://ethereum-sepolia.publicnode.com'),
});

/** Resolve 0x wallet address to ENS name on Ethereum mainnet. */
export async function resolveWalletEns(address) {
  try {
    return await mainnetClient.getEnsName({ address }) ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve ENSIP-26 AI Agent text records for a robot on Sepolia.
 *
 * @param {string} robotLabel  e.g. "stackchan"
 * @param {string} parentName  e.g. "pinch-bots.eth"
 * @returns {{ name, description, capabilities, category, url } | null}
 */
export async function resolveRobotEns(robotLabel, parentName) {
  if (!parentName) return null;
  const ensName = `${robotLabel}.${parentName}`;
  try {
    const [description, capabilities, category, url] = await Promise.all([
      sepoliaClient.getEnsText({ name: ensName, key: 'description' }).catch(() => null),
      sepoliaClient.getEnsText({ name: ensName, key: 'agent.capabilities' }).catch(() => null),
      sepoliaClient.getEnsText({ name: ensName, key: 'agent.category' }).catch(() => null),
      sepoliaClient.getEnsText({ name: ensName, key: 'url' }).catch(() => null),
    ]);
    return { ensName, description, capabilities, category, url };
  } catch {
    return { ensName, description: null, capabilities: null, category: null, url: null };
  }
}

/** Sanitise a robot name into a valid ENS label: lowercase, hyphens, max 63 chars. */
export function toEnsLabel(robotName) {
  return robotName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}
