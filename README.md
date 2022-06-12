Allows any merchant to create a loyalty points rewards program.

Anchor Program

- creates a token mint to use associated with connected phantom wallet with a percentage to reward when USDC is spent (% currently hardcoded on frontend)
- redeem instruction that accepts USDC and the reward token associated with merchant phantom wallet. Burns/Mints reward token based one USDC/Reward token amounts redeemed

Frontend (adapted from pointer.gg tutorial)

- connect phantom wallet
- button to create reward token (can only create 1 mint per wallet)
- form to input USDC/Reward token amounts
- generates QR code using Solana Pay transaction request with instruction from Anchor program for customer to scan
- sends USDC to merchant USDC token account, burns or mints Reward token to customer Reward token account (depending on USDC/Reward token inputs)

Solana Pay QR code scanning requires HTTPS URL (using localhost:3000 won't scan)
Tested with ngrok URL
