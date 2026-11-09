import { createHash } from "node:crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import { loadDotEnv } from "./env.js";

loadDotEnv();

const ESCROW_PROGRAM_ID = "AwtzyMZqxncdqDgpXRnQ2s7Y6zKMmEA8YfCDdLqsPefM";
const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const DEFAULT_SOLANA_RPC_URL = "https://api.devnet.solana.com";
const COMMITMENT = "confirmed";
const MIN_DEPOSIT = 1_000_000n;
const MAX_CREDIT = 100_000_000n;
const SERVICE_PROBE_TIMEOUT_MS = 120_000;
const SERVICE_CALL_TIMEOUT_MS = 90_000;
const ESCROW_ACCOUNT_DISCRIMINATOR = Buffer.from([31, 213, 123, 187, 186, 22, 218, 155]);
const RELEASE_DISCRIMINATOR = Buffer.from([253, 249, 15, 206, 28, 127, 193, 241]);
const REFUND_DISCRIMINATOR = Buffer.from([2, 96, 183, 251, 63, 208, 46, 46]);

function discriminator(namespace, name) {
  return createHash("sha256").update(`${namespace}:${name}`).digest().subarray(0, 8);
}

function requireValue(name, value) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function asKeypair(privateKey) {
  try {
    const secret = bs58.decode(requireValue("buyerPrivateKey", privateKey));
    return Keypair.fromSecretKey(secret);
  } catch (error) {
    throw new Error("buyerPrivateKey must be a valid base58 Solana private key", { cause: error });
  }
}

function asPublicKey(value, name) {
  try {
    return new PublicKey(requireValue(name, value));
  } catch (error) {
    throw new Error(`${name} must be a valid Solana address`, { cause: error });
  }
}

function amountToBaseUnits(amount) {
  const text = String(amount);
  if (!/^\d+(\.\d{1,6})?$/.test(text)) {
    throw new Error("USDC amount must be positive with at most 6 decimal places");
  }
  const [whole, fraction = ""] = text.split(".");
  const baseUnits = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (baseUnits <= 0n) throw new Error("USDC amount must be positive");
  return baseUnits;
}

function u64(value) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(value);
  return bytes;
}

function deriveCreditAddress(programId, buyer, seller, mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credit"), buyer.toBuffer(), seller.toBuffer(), mint.toBuffer()],
    programId,
  )[0];
}

function deriveVaultAddress(programId, credit) {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), credit.toBuffer()], programId)[0];
}

function formatUsdc(amount) {
  const baseUnits = BigInt(amount);
  return `${baseUnits / 1_000_000n}.${(baseUnits % 1_000_000n).toString().padStart(6, "0")} USDC (${baseUnits.toLocaleString("en-US")} base units)`;
}

async function jsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Expected JSON response (HTTP ${response.status})`, { cause: error });
  }
}

async function confirm(connection, signature, blockhash, lastValidBlockHeight) {
  const result = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    COMMITMENT,
  );
  if (result.value.err) throw new Error(`Solana transaction failed: ${JSON.stringify(result.value.err)}`);
}

export class Ghostrail {
  constructor({
    rpcUrl = process.env.SOLANA_RPC_URL || DEFAULT_SOLANA_RPC_URL,
    facilitatorUrl = process.env.FACILITATOR_URL || "https://ghostrail-five.vercel.app",
  } = {}) {
    this.connection = new Connection(requireValue("SOLANA_RPC_URL", rpcUrl), COMMITMENT);
    this.programId = asPublicKey(ESCROW_PROGRAM_ID, "ESCROW_PROGRAM_ID");
    this.mint = asPublicKey(USDC_MINT, "USDC_MINT");
    this.facilitatorUrl = facilitatorUrl.replace(/\/$/, "");
  }

  async checkCredit(buyerAddress, sellerAddress) {
    const buyer = asPublicKey(buyerAddress, "buyerAddress");
    const seller = asPublicKey(sellerAddress, "sellerAddress");
    const credit = deriveCreditAddress(this.programId, buyer, seller, this.mint);
    const account = await this.connection.getAccountInfo(credit, COMMITMENT);
    if (!account) return "0.000000";

    const data = account.data;
    const expectedDiscriminator = discriminator("account", "Credit");
    if (
      !account.owner.equals(this.programId) ||
      data.length < 121 ||
      !data.subarray(0, 8).equals(expectedDiscriminator) ||
      !new PublicKey(data.subarray(8, 40)).equals(buyer) ||
      !new PublicKey(data.subarray(40, 72)).equals(seller) ||
      !new PublicKey(data.subarray(72, 104)).equals(this.mint)
    ) {
      throw new Error(`Invalid GHOSTRAIL credit account at ${credit.toBase58()}`);
    }
    return formatUsdc(data.readBigUInt64LE(104)).split(" ")[0];
  }

  async callService(buyerPrivateKey, apiEndpoint, prompt = "Explain Solana escrow in one sentence.", serviceId) {
    const buyer = asKeypair(buyerPrivateKey);
    requireValue("apiEndpoint", apiEndpoint);
    let challengeResponse;
    try {
      challengeResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(SERVICE_PROBE_TIMEOUT_MS),
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        throw new Error(`Service did not return payment requirements within ${SERVICE_PROBE_TIMEOUT_MS / 1000} seconds: ${apiEndpoint}. Check that the service is running and reachable.`, { cause: error });
      }
      throw error;
    }
    if (challengeResponse.status !== 402) {
      const body = await jsonResponse(challengeResponse);
      if (!challengeResponse.ok) throw new Error(`Service returned HTTP ${challengeResponse.status}: ${JSON.stringify(body)}`);
      return { response: body.response ?? body, transaction: null, endpoint: apiEndpoint, service_id: serviceId ?? process.env.SERVICE_ID ?? null };
    }

    const challenge = await jsonResponse(challengeResponse);
    const terms = Array.isArray(challenge.accepts)
      ? challenge.accepts.find((item) => item?.scheme === "escrow" && item?.network === "solana-devnet")
      : undefined;
    if (
      challenge.x402Version !== 1 || !terms?.payTo || !terms.maxAmountRequired || !terms.asset ||
      !terms.extra?.escrowProgramId || terms.extra?.creditModel !== "prepaid"
    ) {
      throw new Error(`Service returned invalid prepaid payment requirements: ${JSON.stringify(challenge)}`);
    }
    serviceId = serviceId ?? process.env.SERVICE_ID ?? terms.extra.serviceId ?? null;

    const seller = asPublicKey(terms.payTo, "service seller address");
    if (buyer.publicKey.equals(seller)) {
      throw new Error("The buyer wallet and service seller wallet must be different");
    }
    const mint = asPublicKey(terms.asset, "service USDC mint");
    const programId = asPublicKey(terms.extra.escrowProgramId, "service escrow program ID");
    if (!mint.equals(this.mint) || !programId.equals(this.programId)) {
      throw new Error("Service payment terms do not match this SDK's USDC mint and escrow program");
    }
    const amount = BigInt(terms.maxAmountRequired);
    const credit = deriveCreditAddress(this.programId, buyer.publicKey, seller, this.mint);
    const account = await this.getCreditAccount(buyer.publicKey, seller);
    if (account.balance < amount) {
      throw new Error(`Insufficient prepaid credit (${formatUsdc(account.balance)} available; ${formatUsdc(amount)} required)`);
    }

    const vault = deriveVaultAddress(this.programId, credit);
    const sellerToken = getAssociatedTokenAddressSync(this.mint, seller);
    const data = Buffer.concat([
      discriminator("global", "charge_credit"),
      u64(amount),
      u64(account.nextNonce),
    ]);
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
        { pubkey: seller, isSigner: false, isWritable: false },
        { pubkey: this.mint, isSigner: false, isWritable: false },
        { pubkey: credit, isSigner: false, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: sellerToken, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data,
    });
    const { blockhash } = await this.connection.getLatestBlockhash(COMMITMENT);
    const transaction = new Transaction({ feePayer: buyer.publicKey, recentBlockhash: blockhash }).add(instruction);
    transaction.sign(buyer);
    const signedBase64 = transaction.serialize().toString("base64");
    const payment = Buffer.from(JSON.stringify({
      x402Version: 1,
      scheme: "escrow",
      network: "solana-devnet",
      payload: { transaction: signedBase64 },
    })).toString("base64");

    let response;
    try {
      response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-PAYMENT": payment },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(SERVICE_CALL_TIMEOUT_MS),
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        throw new Error(`Paid service did not respond within ${SERVICE_CALL_TIMEOUT_MS / 1000} seconds: ${apiEndpoint}`, { cause: error });
      }
      throw error;
    }
    const body = await jsonResponse(response);
    if (!response.ok) throw new Error(`Paid service returned HTTP ${response.status}: ${JSON.stringify(body)}`);
    const receiptHeader = response.headers.get("X-PAYMENT-RESPONSE");
    if (!receiptHeader) throw new Error("Service response did not include X-PAYMENT-RESPONSE");
    let receipt;
    try {
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(receiptHeader)) {
        throw new Error("invalid base64");
      }
      receipt = JSON.parse(Buffer.from(receiptHeader, "base64").toString("utf8"));
    } catch (error) {
      throw new Error("Service returned an invalid X-PAYMENT-RESPONSE header", { cause: error });
    }
    if (
      body.payment?.accepted !== true || body.charge?.success !== true ||
      receipt?.success !== true || receipt?.network !== "solana-devnet" ||
      receipt?.transaction !== body.charge?.signature
    ) {
      throw new Error("Service response did not include a matching confirmed payment receipt");
    }
    return {
      response: body.response ?? body,
      transaction: receipt.transaction,
      endpoint: apiEndpoint,
      service_id: serviceId,
    };
  }

  async depositCredit(buyerPrivateKey, sellerAddress, amountUsdc = "1") {
    const buyer = asKeypair(buyerPrivateKey);
    const seller = asPublicKey(sellerAddress, "sellerAddress");
    if (buyer.publicKey.equals(seller)) throw new Error("Buyer and seller must be different wallets");
    const amount = amountToBaseUnits(amountUsdc);
    if (amount < MIN_DEPOSIT || amount > MAX_CREDIT) throw new Error("Deposit must be between 1 and 100 USDC");
    const current = await this.getCreditAccount(buyer.publicKey, seller);
    if (current.balance + amount > MAX_CREDIT) throw new Error("Deposit would exceed the 100 USDC credit cap");

    console.log(`Buyer          : ${buyer.publicKey.toBase58()}`);
    console.log(`Seller         : ${seller.toBase58()}`);
    console.log(`Credit account : ${current.credit.toBase58()}`);
    console.log(`Deposit        : ${formatUsdc(amount)}`);

    const buyerBalance = await this.connection.getBalance(buyer.publicKey, COMMITMENT);
    if (buyerBalance < 10_000_000) throw new Error("Buyer wallet needs at least 0.01 devnet SOL for fees and rent");
    const buyerToken = await this.getOrCreateBuyerTokenAccount(buyer);
    const tokenBalance = await this.connection.getTokenAccountBalance(buyerToken, COMMITMENT);
    if (BigInt(tokenBalance.value.amount) < amount) throw new Error("Buyer USDC token account has insufficient funds");

    const credit = deriveCreditAddress(this.programId, buyer.publicKey, seller, this.mint);
    const vault = deriveVaultAddress(this.programId, credit);
    const sellerToken = getAssociatedTokenAddressSync(this.mint, seller);
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
        { pubkey: seller, isSigner: false, isWritable: false },
        { pubkey: this.mint, isSigner: false, isWritable: false },
        { pubkey: credit, isSigner: false, isWritable: true },
        { pubkey: buyerToken, isSigner: false, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: sellerToken, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator("global", "deposit_credit"), u64(amount)]),
    });
    const { blockhash } = await this.connection.getLatestBlockhash(COMMITMENT);
    const transaction = new Transaction({ feePayer: buyer.publicKey, recentBlockhash: blockhash }).add(instruction);
    transaction.sign(buyer);
    const transactionBase64 = transaction.serialize().toString("base64");
    let response;
    try {
      response = await fetch(`${this.facilitatorUrl}/api/settlements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deposit", transaction: transactionBase64 }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw new Error(`Facilitator request failed: ${error.message}`, { cause: error });
    }
    const result = await jsonResponse(response);
    if (!response.ok || result.success !== true) throw new Error(`Prepaid USDC deposit failed: ${JSON.stringify(result)}`);
    console.log(`Deposit confirmed: ${result.signature}`);
    console.log(`Available credit : ${formatUsdc(BigInt(result.balance))}`);
    return result;
  }

  async withdrawCredit(buyerPrivateKey, sellerAddress) {
    const buyer = asKeypair(buyerPrivateKey);
    const seller = asPublicKey(sellerAddress, "sellerAddress");
    const credit = deriveCreditAddress(this.programId, buyer.publicKey, seller, this.mint);
    const current = await this.getCreditAccount(buyer.publicKey, seller);
    if (current.balance === 0n) {
      console.log("No prepaid USDC remains for this buyer and seller.");
      return null;
    }
    console.log(`Buyer          : ${buyer.publicKey.toBase58()}`);
    console.log(`Seller         : ${seller.toBase58()}`);
    console.log(`Credit account : ${current.credit.toBase58()}`);
    console.log(`Withdrawal     : ${formatUsdc(current.balance)}`);
    const buyerToken = await this.getOrCreateBuyerTokenAccount(buyer);
    const vault = deriveVaultAddress(this.programId, credit);
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
        { pubkey: this.mint, isSigner: false, isWritable: false },
        { pubkey: credit, isSigner: false, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: buyerToken, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator("global", "withdraw_credit"), u64(current.balance)]),
    });
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(COMMITMENT);
    const transaction = new Transaction({ feePayer: buyer.publicKey, recentBlockhash: blockhash }).add(instruction);
    transaction.sign(buyer);
    const signature = await this.connection.sendRawTransaction(transaction.serialize());
    await confirm(this.connection, signature, blockhash, lastValidBlockHeight);
    console.log(`Withdrawal confirmed: ${signature}`);
    console.log("Available credit   : 0.000000 USDC (0 base units)");
    return signature;
  }

  async settleEscrowAction(action, escrowAddress, authority = null) {
    if (action !== "release" && action !== "refund") {
      throw new Error('Escrow action must be "release" or "refund"');
    }
    const escrowKey = asPublicKey(escrowAddress, "escrowAddress");
    const account = await this.connection.getAccountInfo(escrowKey, COMMITMENT);
    if (
      !account || !account.owner.equals(this.programId) || account.data.length < 130 ||
      !account.data.subarray(0, 8).equals(ESCROW_ACCOUNT_DISCRIMINATOR)
    ) {
      throw new Error(`Escrow account was not found at ${escrowKey.toBase58()}`);
    }
    const data = account.data;
    const buyer = new PublicKey(data.subarray(8, 40));
    const seller = new PublicKey(data.subarray(40, 72));
    const mint = new PublicKey(data.subarray(72, 104));
    const timeout = Number(data.readBigInt64LE(112));
    if (data[128] !== 0) throw new Error("Escrow is not Locked; it may already be released or refunded");
    if (!mint.equals(this.mint)) throw new Error("Escrow mint does not match USDC_MINT");
    if (action === "refund" && Math.floor(Date.now() / 1000) < timeout) {
      throw new Error(`Refund is not available for ${timeout - Math.floor(Date.now() / 1000)} more seconds`);
    }

    if (!authority) {
      if (action === "refund") {
        authority = asKeypair(process.env.BUYER_PRIVATE_KEY);
      } else if (process.env.SELLER_PRIVATE_KEY) {
        authority = asKeypair(process.env.SELLER_PRIVATE_KEY);
      } else if (process.env.BUYER_PRIVATE_KEY) {
        authority = asKeypair(process.env.BUYER_PRIVATE_KEY);
      } else {
        throw new Error("A signing key is required for settlement");
      }
    }
    if (action === "release" && !authority.publicKey.equals(seller)) {
      throw new Error(`Signing key ${authority.publicKey.toBase58()} does not match escrow seller ${seller.toBase58()}`);
    }

    const facilitator = action === "release"
      ? process.env.FACILITATOR_PUBLIC_KEY
        ? asPublicKey(process.env.FACILITATOR_PUBLIC_KEY, "FACILITATOR_PUBLIC_KEY")
        : asKeypair(process.env.FACILITATOR_PRIVATE_KEY).publicKey
      : null;
    if (action === "refund" && !authority.publicKey.equals(buyer)) {
      throw new Error("Only the buyer recorded in the escrow can submit a manual refund");
    }
    if (action === "release" && authority.publicKey.equals(facilitator)) {
      throw new Error("The facilitator cannot be the escrow authority");
    }

    const recipient = action === "release" ? seller : buyer;
    const recipientToken = await this.getOrCreateTokenAccount(authority, recipient);
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowKey.toBuffer()],
      this.programId,
    );
    const keys = action === "release"
      ? [
          { pubkey: buyer, isSigner: false, isWritable: true },
          { pubkey: seller, isSigner: true, isWritable: false },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: escrowKey, isSigner: false, isWritable: true },
          { pubkey: vault, isSigner: false, isWritable: true },
          { pubkey: recipientToken, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ]
      : [
          { pubkey: authority.publicKey, isSigner: true, isWritable: false },
          { pubkey: buyer, isSigner: false, isWritable: true },
          { pubkey: seller, isSigner: false, isWritable: false },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: escrowKey, isSigner: false, isWritable: true },
          { pubkey: vault, isSigner: false, isWritable: true },
          { pubkey: recipientToken, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys,
      data: action === "release" ? RELEASE_DISCRIMINATOR : REFUND_DISCRIMINATOR,
    });
    const { blockhash } = await this.connection.getLatestBlockhash(COMMITMENT);
    const transaction = new Transaction({
      feePayer: action === "refund" ? authority.publicKey : facilitator,
      recentBlockhash: blockhash,
    }).add(instruction);
    transaction.partialSign(authority);
    const transactionBase64 = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");

    let response;
    try {
      response = await fetch(`${this.facilitatorUrl}/api/settlements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrowAddress: escrowKey.toBase58(), action, transaction: transactionBase64 }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw new Error(`Facilitator request failed: ${error.message}`, { cause: error });
    }
    const result = await jsonResponse(response);
    if (!response.ok || result.success !== true) throw new Error(`Settlement failed: ${JSON.stringify(result)}`);
    return result;
  }

  async releaseEscrow(escrowAddress, authority = null) {
    return this.settleEscrowAction("release", escrowAddress, authority);
  }

  async refundEscrow(escrowAddress, authority = null) {
    return this.settleEscrowAction("refund", escrowAddress, authority);
  }

  async getCreditAccount(buyer, seller) {
    const credit = deriveCreditAddress(this.programId, buyer, seller, this.mint);
    const account = await this.connection.getAccountInfo(credit, COMMITMENT);
    if (!account) return { credit, balance: 0n, nextNonce: 0n };
    const data = account.data;
    const expectedDiscriminator = discriminator("account", "Credit");
    if (
      !account.owner.equals(this.programId) ||
      data.length < 121 ||
      !data.subarray(0, 8).equals(expectedDiscriminator) ||
      !new PublicKey(data.subarray(8, 40)).equals(buyer) ||
      !new PublicKey(data.subarray(40, 72)).equals(seller) ||
      !new PublicKey(data.subarray(72, 104)).equals(this.mint)
    ) {
      throw new Error(`Invalid GHOSTRAIL credit account at ${credit.toBase58()}`);
    }
    return { credit, balance: data.readBigUInt64LE(104), nextNonce: data.readBigUInt64LE(112) };
  }

  async getOrCreateBuyerTokenAccount(buyer) {
    return this.getOrCreateTokenAccount(buyer, buyer.publicKey);
  }

  async getOrCreateTokenAccount(payer, owner) {
    const address = getAssociatedTokenAddressSync(this.mint, owner);
    const account = await this.connection.getAccountInfo(address, COMMITMENT);
    if (account) return address;
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(COMMITMENT);
    const transaction = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(
      createAssociatedTokenAccountInstruction(payer.publicKey, address, owner, this.mint),
    );
    transaction.sign(payer);
    const signature = await this.connection.sendRawTransaction(transaction.serialize());
    await confirm(this.connection, signature, blockhash, lastValidBlockHeight);
    return address;
  }
}

export { Ghostrail as Buyer };
export { loadDotEnv };
