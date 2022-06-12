import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  LAMPORTS_PER_SOL,
  TransactionSignature,
  Transaction,
  PublicKey,
} from '@solana/web3.js'
import { getMint, Mint } from '@solana/spl-token'
import { FC, useCallback } from 'react'

import { createCreateTokenRewardInstruction } from '../src/generated/instructions/createTokenReward'
import idl from '../pages/api/token_rewards.json'

export const CreateToken: FC = () => {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const onClick = useCallback(async () => {
    const programId = new PublicKey(idl.metadata.address)
    if (!publicKey) {
      console.log('error', 'Wallet not connected!')
      return
    }

    const [rewardDataPda, rewardDataBump] = await PublicKey.findProgramAddress(
      [Buffer.from('DATA'), publicKey.toBuffer()],
      programId
    )

    const [rewardMintPda, rewardMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from('MINT'), rewardDataPda.toBuffer()],
      programId
    )

    const { blockhash } = await connection.getLatestBlockhash('finalized')

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: publicKey,
    })

    const instruction = createCreateTokenRewardInstruction(
      {
        rewardData: rewardDataPda,
        rewardMint: rewardMintPda,
        user: publicKey,
      },
      { rewardBasisPoints: 100 }
    )

    transaction.add(instruction)

    let signature: TransactionSignature = ''

    try {
      signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')
    } catch (error: any) {}
  }, [publicKey, connection])

  return (
    <div>
      <button
        className="max-w-fit items-center self-center rounded-md bg-gray-900 px-20 py-2 text-white hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onClick}
      >
        <span>Create Reward Token </span>
      </button>
    </div>
  )
}
