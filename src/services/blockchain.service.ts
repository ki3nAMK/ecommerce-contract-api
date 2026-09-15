import { join } from 'path';
import { readFileSync } from 'fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';

const MyERC1155ABI = JSON.parse(
  readFileSync(join(__dirname, '..', 'abis', 'MyERC1155.json'), 'utf8'),
);
const EscrowABI = JSON.parse(
  readFileSync(join(__dirname, '..', 'abis', 'Escrow.json'), 'utf8'),
);
const AirdropDistributorABI = JSON.parse(
  readFileSync(join(__dirname, '..', 'abis', 'AirdropDistributor.json'), 'utf8'),
);

@Injectable()
export class BlockchainService {
  private readonly provider: JsonRpcProvider;
  private readonly adminSigner: Wallet;
  private readonly myErc1155: Contract;
  private readonly escrow: Contract;
  private readonly airdrop: Contract;

  // Serializes all admin-signer transactions and tracks the nonce locally —
  // ethers' automatic "pending" nonce lookup can return a stale value when
  // multiple txs are sent back-to-back from the same signer (observed on
  // local Hardhat automining), so nonces are assigned explicitly instead.
  private nonce: number | null = null;
  private txQueue: Promise<unknown> = Promise.resolve();

  constructor(configService: ConfigService) {
    const { rpcUrl, adminPrivateKey, erc1155Address, escrowAddress, airdropAddress } =
      configService.get('blockchain');

    this.provider = new JsonRpcProvider(rpcUrl);
    this.adminSigner = new Wallet(adminPrivateKey, this.provider);
    this.myErc1155 = new Contract(erc1155Address, MyERC1155ABI, this.adminSigner);
    this.escrow = new Contract(escrowAddress, EscrowABI, this.adminSigner);
    this.airdrop = new Contract(airdropAddress, AirdropDistributorABI, this.adminSigner);
  }

  private sendTx(
    contract: Contract,
    method: string,
    args: unknown[],
    overrides: Record<string, unknown> = {},
  ) {
    const run = async () => {
      if (this.nonce === null) {
        this.nonce = await this.provider.getTransactionCount(
          this.adminSigner.address,
          'latest',
        );
      }
      const nonce = this.nonce++;
      const tx = await (contract as any)[method](...args, { ...overrides, nonce });
      return tx.wait();
    };

    const result = this.txQueue.then(run);
    // keep the queue alive even if this call fails, so later calls still run
    this.txQueue = result.catch(() => undefined);
    return result;
  }

  async ensureSellerRegistered(sellerAddress: string): Promise<void> {
    const isValidSeller: boolean = await this.escrow.isSeller(sellerAddress);
    if (isValidSeller) return;

    await this.sendTx(this.escrow, 'addSeller', [sellerAddress]);
  }

  async mintProductToken(sellerAddress: string, quantity: number): Promise<string> {
    const receipt: any = await this.sendTx(this.myErc1155, 'mintAuto', [
      sellerAddress,
      quantity,
      '0x',
    ]);

    const transferEvent = receipt.logs
      .map((log: any) => {
        try {
          return this.myErc1155.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: any) => event && event.name === 'TransferSingle');

    return transferEvent.args.id.toString();
  }

  async setAirdropMerkleRoot(campaignId: number, merkleRoot: string): Promise<void> {
    await this.sendTx(this.airdrop, 'setMerkleRoot', [campaignId, merkleRoot]);
  }

  async fundAirdropCampaign(campaignId: number, amountWei: string): Promise<void> {
    await this.sendTx(this.airdrop, 'fundCampaign', [campaignId], { value: amountWei });
  }
}
