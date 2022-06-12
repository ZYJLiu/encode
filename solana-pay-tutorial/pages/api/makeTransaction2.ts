//ngrok http 3000

import {
  getAssociatedTokenAddress,
  getMint,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  getAccount,
  Account,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import { NextApiRequest, NextApiResponse } from 'next'
import { usdcAddress } from '../../lib/addresses'
import calculatePrice from '../../lib/calculatePrice2'
import calculateItem from '../../lib/calculatePrice3'

import idl from './token_rewards.json'

import { createRedeemInstruction } from '../../src/generated/instructions/redeem'

export type MakeTransactionInputData = {
  account: string
}

type MakeTransactionGetResponse = {
  label: string
  icon: string
}

export type MakeTransactionOutputData = {
  transaction: string
  message: string
}

type ErrorOutput = {
  error: string
}

function get(res: NextApiResponse<MakeTransactionGetResponse>) {
  res.status(200).json({
    label: 'Cookies Inc',
    icon: 'https://freesvg.org/img/1370962427.png',
  })
}

async function post(
  req: NextApiRequest,
  res: NextApiResponse<MakeTransactionOutputData | ErrorOutput>
) {
  try {
    // We pass the selected items in the query, calculate the expected cost
    const amount = calculatePrice(req.query)
    if (amount.toNumber() === 0) {
      console.log('Returning 400: amount = 0')
      res.status(400).json({ error: "Can't checkout with charge of 0" })
      return
    }

    // We pass the reference to use in the query
    const { reference } = req.query
    if (!reference) {
      console.log('Returning 400: no reference')
      res.status(400).json({ error: 'No reference provided' })
      return
    }
    console.log(reference)

    // We pass the buyer's public key in JSON body
    const { account } = req.body as MakeTransactionInputData
    if (!account) {
      console.log('Returning 400: no account')
      res.status(400).json({ error: 'No account provided' })
      return
    }

    const { wallet } = req.query
    if (!wallet) {
      console.log('Returning 400: no wallet')
      res.status(400).json({ error: 'No walet provided' })
      return
    }

    const buyerPublicKey = new PublicKey(account)
    const publicKey = new PublicKey(wallet)

    const network = WalletAdapterNetwork.Devnet
    const endpoint = clusterApiUrl(network)
    const connection = new Connection(endpoint)

    // Get details about the USDC token
    const usdcMint = await getMint(connection, usdcAddress)

    const programId = new PublicKey(idl.metadata.address)

    const [rewardDataPda, rewardDataBump] = await PublicKey.findProgramAddress(
      [Buffer.from('DATA'), publicKey.toBuffer()],
      programId
    )

    const [rewardMintPda, rewardMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from('MINT'), rewardDataPda.toBuffer()],
      programId
    )

    // Get a recent blockhash to include in the transaction
    const { blockhash } = await connection.getLatestBlockhash('finalized')

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: buyerPublicKey,
    })

    const customerRewardToken = await getAssociatedTokenAddress(
      rewardMintPda,
      buyerPublicKey
    )

    const customerUsdcToken = await getAssociatedTokenAddress(
      usdcAddress,
      buyerPublicKey
    )

    const userUsdcToken = await getAssociatedTokenAddress(
      usdcAddress,
      publicKey
    )

    const createAccountInstruction = createAssociatedTokenAccountInstruction(
      buyerPublicKey,
      customerRewardToken,
      buyerPublicKey,
      rewardMintPda,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    let buyer: Account
    try {
      buyer = await getAccount(
        connection,
        customerRewardToken,
        'confirmed',
        TOKEN_PROGRAM_ID
      )
    } catch (error: unknown) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        try {
          transaction.add(createAccountInstruction)
        } catch (error: unknown) {}
      } else {
        throw error
      }
    }

    const [amount1, amount2] = calculateItem(req.query)
    const transferInstruction = createRedeemInstruction(
      {
        rewardData: rewardDataPda,
        rewardMint: rewardMintPda,
        usdcMint: usdcAddress,
        customerRewardToken: customerRewardToken,
        customerUsdcToken: customerUsdcToken,
        userUsdcToken: userUsdcToken,
        user: publicKey,
        customer: buyerPublicKey,
      },
      {
        usdcToken: amount1.toNumber() * 10 ** usdcMint.decimals,
        rewardToken: amount2.toNumber() * 10 ** usdcMint.decimals,
      }
    )

    // Add the reference to the instruction as a key
    // This will mean this transaction is returned when we query for the reference
    transferInstruction.keys.push({
      pubkey: new PublicKey(reference),
      isSigner: false,
      isWritable: false,
    })

    // Add both instructions to the transaction
    transaction.add(transferInstruction)

    // Serialize the transaction and convert to base64 to return it
    const serializedTransaction = transaction.serialize({
      // We will need the buyer to sign this transaction after it's returned to them
      requireAllSignatures: false,
    })

    const base64 = serializedTransaction.toString('base64')

    // Insert into database: reference, amount

    const message = 'Thanks for your order! 🍪'

    // Return the serialized transaction
    const responseBody = {
      transaction: base64,
      message,
    }

    console.log('returning 200', responseBody)
    res.status(200).json(responseBody)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'error creating transaction' })
    return
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    MakeTransactionGetResponse | MakeTransactionOutputData | ErrorOutput
  >
) {
  if (req.method === 'GET') {
    return get(res)
  } else if (req.method === 'POST') {
    return await post(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
