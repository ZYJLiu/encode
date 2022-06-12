import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  TransactionSignature,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import { FC, useCallback } from "react";
import { notify } from "../utils/notifications";
import useUserSOLBalanceStore from "../stores/useUserSOLBalanceStore";

import { createCreateTokenRewardInstruction } from "../anchor/instructions/createTokenReward";
import idl from "./token_rewards.json";

export const CreateToken: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  const onClick = useCallback(async () => {
    if (!publicKey) {
      console.log("error", "Wallet not connected!");
      notify({
        type: "error",
        message: "error",
        description: "Wallet not connected!",
      });
      return;
    }

    const programId = new PublicKey(idl.metadata.address);

    const [rewardDataPda, rewardDataBump] = await PublicKey.findProgramAddress(
      [Buffer.from("DATA"), publicKey.toBuffer()],
      programId
    );

    const [rewardMintPda, rewardMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from("MINT"), rewardDataPda.toBuffer()],
      programId
    );

    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: publicKey,
    });

    const instruction = createCreateTokenRewardInstruction(
      {
        rewardData: rewardDataPda,
        rewardMint: rewardMintPda,
        user: publicKey,
      },
      { rewardBasisPoints: 100 }
    );

    transaction.add(instruction);

    let signature: TransactionSignature = "";

    try {
      signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      notify({
        type: "success",
        message: "Airdrop successful!",
        txid: signature,
      });

      getUserSOLBalance(publicKey, connection);
    } catch (error: any) {
      notify({
        type: "error",
        message: `Airdrop failed!`,
        description: error?.message,
        txid: signature,
      });
      console.log("error", `Airdrop failed! ${error?.message}`, signature);
    }
  }, [publicKey, connection, getUserSOLBalance]);

  return (
    <div>
      <button
        className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
        onClick={onClick}
      >
        <span>Create Reward Token </span>
      </button>
    </div>
  );
};
