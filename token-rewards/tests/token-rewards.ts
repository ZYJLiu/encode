import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenRewards } from "../target/types/token_rewards";

import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccount,
  getAccount,
  createMint,
  mintTo,
  Account,
  transfer,
} from "@solana/spl-token";

import fs from "fs";

const amount = 100;

let usdcMint: PublicKey;
let payer: Keypair;

describe("token-rewards", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.TokenRewards as Program<TokenRewards>;
  const connection = anchor.getProvider().connection;
  const userWallet = anchor.workspace.TokenRewards.provider.wallet;

  before(async () => {
    payer = Keypair.generate();
    const signature = await connection.requestAirdrop(
      payer.publicKey,
      LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature);

    // //usdc devnet address
    // usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

    // create "usdc" mint to for localhost testing
    usdcMint = await createMint(
      connection, //connection to Solana
      payer, //user randomPayer helper to create accounts for test
      payer.publicKey, // mint authority
      null, // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
      6, // decimals
      usdcMintKeypair
    );

    console.log(usdcMint.toString());
  });

  it("Create New Reward Token", async () => {
    // Add your test here.
    const [rewardDataPda, rewardDataBump] = await PublicKey.findProgramAddress(
      [Buffer.from("DATA"), userWallet.publicKey.toBuffer()],
      program.programId
    );

    const [rewardMintPda, rewardMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from("MINT"), rewardDataPda.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .createTokenReward(new anchor.BN(100))
      .accounts({
        rewardData: rewardDataPda,
        rewardMint: rewardMintPda,
        user: userWallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    // console.log("Your transaction signature", tx);

    const token = await program.account.tokenData.fetch(rewardDataPda);
    // console.log(token);
  });

  it("Redeem", async () => {
    const Wallet = Keypair.generate();
    const AirdropSignature = await connection.requestAirdrop(
      Wallet.publicKey,
      LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(AirdropSignature);

    const [rewardDataPda, rewardDataBump] = await PublicKey.findProgramAddress(
      [Buffer.from("DATA"), userWallet.publicKey.toBuffer()],
      program.programId
    );

    const [rewardMintPda, rewardMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from("MINT"), rewardDataPda.toBuffer()],
      program.programId
    );

    const rewardTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      rewardMintPda,
      Wallet.publicKey
    );

    const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      usdcMint,
      Wallet.publicKey
    );

    const userUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      usdcMint,
      userWallet.publicKey
    );

    await mintTo(
      connection, // connection to Solana
      payer, // payer for test
      usdcMint, // USDC Token Mint
      usdcTokenAccount.address, // User USDC Token Account (destination)
      payer.publicKey, // Mint Authority (required as signer)
      amount * 10
    );

    const rewardData = await program.account.tokenData.fetch(rewardDataPda);

    try {
      await program.rpc.redeem(new anchor.BN(amount * 2), new anchor.BN(0), {
        accounts: {
          rewardData: rewardDataPda,
          rewardMint: rewardData.rewardMint,
          usdcMint: usdcMint,
          customerRewardToken: rewardTokenAccount.address,
          customerUsdcToken: usdcTokenAccount.address,
          userUsdcToken: userUsdcTokenAccount.address,
          user: userWallet.publicKey,
          customer: Wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [Wallet],
      });
    } catch (error) {
      console.log(error);
    }

    const balance1 = await getMint(connection, rewardData.rewardMint);

    const balance2 = (
      await connection.getTokenAccountBalance(rewardTokenAccount.address)
    ).value.amount;

    const balance3 = (
      await connection.getTokenAccountBalance(usdcTokenAccount.address)
    ).value.amount;

    const balance4 = (
      await connection.getTokenAccountBalance(userUsdcTokenAccount.address)
    ).value.amount;

    console.log("Reward Token Mint Supply:", Number(balance1.supply));
    console.log("Customer Reward Token Balance:", balance2);
    console.log("Customer USDC Balance:", balance3);
    console.log("Merchant USDC Balance:", balance4);

    try {
      await program.rpc.redeem(new anchor.BN(amount), new anchor.BN(2), {
        accounts: {
          rewardData: rewardDataPda,
          rewardMint: rewardData.rewardMint,
          usdcMint: usdcMint,
          customerRewardToken: rewardTokenAccount.address,
          customerUsdcToken: usdcTokenAccount.address,
          userUsdcToken: userUsdcTokenAccount.address,
          user: userWallet.publicKey,
          customer: Wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [Wallet],
      });
    } catch (error) {
      console.log(error);
    }

    const balance5 = await getMint(connection, rewardData.rewardMint);

    const balance6 = (
      await connection.getTokenAccountBalance(rewardTokenAccount.address)
    ).value.amount;

    const balance7 = (
      await connection.getTokenAccountBalance(usdcTokenAccount.address)
    ).value.amount;

    const balance8 = (
      await connection.getTokenAccountBalance(userUsdcTokenAccount.address)
    ).value.amount;

    console.log("Reward Token Mint Supply:", Number(balance5.supply));
    console.log("Customer Reward Token Balance:", balance6);
    console.log("Customer USDC Balance:", balance7);
    console.log("Merchant USDC Balance:", balance8);
  });
});

// @ts-ignore
// local test "usdc"
// solana-keygen new --outfile .keys/usdc_mint.json
const usdcData = JSON.parse(fs.readFileSync(".keys/usdc_mint.json"));
const usdcMintKeypair = Keypair.fromSecretKey(new Uint8Array(usdcData));
const usdcMintAddress = usdcMintKeypair.publicKey;
console.log("USDC Mint:", usdcMintAddress.toString());
