Allows any merchant to create a loyalty points rewards program using Solana Pay transaction request QR code.

Anchor Program

- creates a token mint to use associated with connected phantom wallet with a percentage to reward when USDC is spent (1% reward input currently hardcoded on frontend, Anchor instruction accepts any input)
- redeem instruction that accepts USDC and the reward token associated with merchant phantom wallet. Burns/Mints reward token based on USDC/Reward token amounts spent

Frontend (adapted from pointer.gg tutorial)

- connect phantom wallet
- button to create reward token (can only create 1 mint per wallet, PDA uses publickey as seed)
- form to input USDC/Reward token amounts
- generates QR code using Solana Pay transaction request with instruction from Anchor program for customer to scan
- sends USDC to merchant USDC token account, burns or mints Reward token to customer Reward token account (depending on USDC/Reward token inputs)

Solana Pay QR code scanning requires HTTPS URL (using localhost:3000 won't scan)
Tested with ngrok URL

Both "merchant" (connected wallet) and "customer" (wallet scanning QR code) need to have a "Devnet USDC" token account from the mint below for transactions to work

Get Devnet "USDC" from here
https://spl-token-faucet.com/?token-name=USDC-Dev

Mint = Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
