import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Input from '../components/Input'
import React, { useState, useEffect } from 'react'
import { CreateToken } from '../components/CreateToken'

export default function HomePage() {
  // We get the public key of the connected wallet, if there is one
  const { publicKey } = useWallet()
  const [wallet, setWallet] = useState('')
  useEffect(() => {
    if (publicKey) {
      setWallet(publicKey.toString())
    }
  }, [publicKey])

  console.log('connected', wallet)

  return (
    <div className="m-auto flex max-w-4xl flex-col items-stretch gap-8 pt-24">
      {/* We add the Solana wallet connect button */}
      <div className="basis-1/4">
        <WalletMultiButton className="!bg-gray-900 hover:scale-105" />
      </div>
      <CreateToken />

      <Input submitTarget="/checkout2" enabled={publicKey !== null} />

      {/* We disable checking out without a connected wallet */}
      {/* Also the submitTarget is /buy/transaction instead of /checkout */}
      {/* <Products submitTarget="/checkout" enabled={publicKey !== null} /> */}
    </div>
  )
}
