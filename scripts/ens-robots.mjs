/**
 * Pinch — ENS Robot Fleet Setup
 *
 * Registers each robot type as an ENS subname on Sepolia testnet.
 * Sets text records following ENSIP-26 (AI Agent Text Records).
 *
 * Prerequisites:
 *   1. Register your parent name on Sepolia ENS:
 *      → https://app.ens.domains  (switch network to Sepolia)
 *      → Get free Sepolia ETH: https://sepoliafaucet.com
 *   2. Add to .env:
 *        ENS_PARENT_NAME=your-name.eth
 *        ENS_PRIVATE_KEY=0x...          (must own the parent name)
 *   3. Run: npm run ens:setup
 */

import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  namehash,
  labelhash,
} from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ENS Registry — same address on every network
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';

const REGISTRY_ABI = [
  {
    name: 'resolver',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node',     type: 'bytes32' },
      { name: 'label',    type: 'bytes32' },
      { name: 'owner',    type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl',      type: 'uint64'  },
    ],
    outputs: [],
  },
];

const RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node',  type: 'bytes32' },
      { name: 'key',   type: 'string'  },
      { name: 'value', type: 'string'  },
    ],
    outputs: [],
  },
];

// Robot agents to register — add new robot types here
const ROBOT_AGENTS = [
  {
    label: 'stackchan',
    records: {
      // Standard ENS records
      name:        'Stackchan',
      description: 'Autonomous warehouse robot built on M5Stack — detects obstacles and posts HBAR bounties for human rescuers',
      url:         'https://pinch-bounty.vercel.app/bounties',
      // ENSIP-26 AI Agent records
      'agent.category':     'physical-robot',
      'agent.capabilities': 'obstacle-detection,bounty-posting,HBAR-payment,human-rescue-coordination',
      'agent.version':      '1.0.0',
      // Custom operational records
      'com.pinch.network':  'Hedera Testnet',
      'com.pinch.payment':  'HBAR',
    },
  },
];

async function setRecord(walletClient, publicClient, resolverAddress, node, key, value) {
  const hash = await walletClient.writeContract({
    address:      resolverAddress,
    abi:          RESOLVER_ABI,
    functionName: 'setText',
    args:         [node, key, value],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`    setText(${key}) ✓`);
}

async function main() {
  const parentName = process.env.ENS_PARENT_NAME;
  const privateKey = process.env.ENS_PRIVATE_KEY;
  const rpcUrl     = process.env.ENS_RPC || 'https://ethereum-sepolia.publicnode.com';

  if (!parentName || !privateKey) {
    console.error('\n[ERROR] Missing .env vars:');
    console.error('  ENS_PARENT_NAME=your-name.eth   (registered on Sepolia ENS)');
    console.error('  ENS_PRIVATE_KEY=0x...            (wallet that owns the name)');
    console.error('\nRegister for free: https://app.ens.domains (switch to Sepolia)');
    console.error('Get Sepolia ETH:   https://sepoliafaucet.com\n');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: sepolia, transport: http(rpcUrl), account });

  console.log('\n=== Pinch ENS Robot Fleet Setup ===');
  console.log(`Parent name : ${parentName}`);
  console.log(`Owner       : ${account.address}`);
  console.log(`Network     : Sepolia testnet\n`);

  const parentNode = namehash(parentName);

  // Get the resolver from the ENS registry for this parent name
  const resolverAddress = await publicClient.readContract({
    address:      ENS_REGISTRY,
    abi:          REGISTRY_ABI,
    functionName: 'resolver',
    args:         [parentNode],
  });

  if (resolverAddress === '0x0000000000000000000000000000000000000000') {
    console.error(`[ERROR] No resolver found for "${parentName}"`);
    console.error(`Make sure you've registered it at https://app.ens.domains (Sepolia network)`);
    process.exit(1);
  }

  console.log(`Resolver : ${resolverAddress}\n`);

  for (const robot of ROBOT_AGENTS) {
    const subname     = `${robot.label}.${parentName}`;
    const labelHash   = labelhash(robot.label);
    const subnameNode = namehash(subname);

    console.log(`Registering ${subname}...`);

    // Step 1: Create the subname in the registry
    const subnameTx = await walletClient.writeContract({
      address:      ENS_REGISTRY,
      abi:          REGISTRY_ABI,
      functionName: 'setSubnodeRecord',
      args:         [parentNode, labelHash, account.address, resolverAddress, 0n],
    });
    await publicClient.waitForTransactionReceipt({ hash: subnameTx });
    console.log(`  Subname created ✓`);

    // Step 2: Set all ENSIP-26 text records
    for (const [key, value] of Object.entries(robot.records)) {
      await setRecord(walletClient, publicClient, resolverAddress, subnameNode, key, value);
    }

    console.log(`\n  ✓  ${subname}`);
    console.log(`     https://app.ens.domains/${subname}\n`);
  }

  const parentDisplay = process.env.ENS_PARENT_NAME;
  console.log('✓ Robot fleet registered on ENS!\n');
  console.log('Next steps:');
  console.log(`  1. Add to Vercel env vars: VITE_ENS_PARENT_NAME=${parentDisplay}`);
  console.log(`  2. Redeploy: npm run deploy:frontend`);
  console.log(`  3. View on ENS: https://app.ens.domains/${parentDisplay}`);
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
