import { keccak256, solidityPackedKeccak256 } from 'ethers';
import { MerkleTree } from 'merkletreejs';

// merkletreejs expects a hash function operating on Buffers; wrap ethers'
// keccak256 (avoids pulling in a second, redundant crypto/keccak dependency).
function keccak256Buffer(data: Buffer): Buffer {
  return Buffer.from(keccak256(data).slice(2), 'hex');
}

export function leafFor(publicAddress: string, amountWei: string): Buffer {
  const hash = solidityPackedKeccak256(['address', 'uint256'], [publicAddress, amountWei]);
  return Buffer.from(hash.slice(2), 'hex');
}

export function buildAirdropTree(
  recipients: { publicAddress: string; amountWei: string }[],
): { tree: MerkleTree; root: string } {
  const leaves = recipients.map((r) => leafFor(r.publicAddress, r.amountWei));
  const tree = new MerkleTree(leaves, keccak256Buffer, { sortPairs: true });
  return { tree, root: tree.getHexRoot() };
}

export function getProofFor(
  tree: MerkleTree,
  publicAddress: string,
  amountWei: string,
): string[] {
  return tree.getHexProof(leafFor(publicAddress, amountWei));
}
