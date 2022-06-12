use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount,};

declare_id!("DdV3ttvqbXm9uMW1XX5AUDkf7v9mgkQdFjNkrp4zkDyQ");

// Replace for Devnet Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
// Replace for Localnet 8fFnX9WSPjJEADtG5jQvQQptzfFmmjd6hrW7HjuUT8ur
pub const USDC_MINT_ADDRESS: &str = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

#[program]
pub mod token_rewards {
    use super::*;

    pub fn create_token_reward(ctx: Context<CreateTokenReward>, reward_basis_points: u64) -> Result<()> {
        let (reward_mint, reward_bump) =
            Pubkey::find_program_address(&["MINT".as_bytes(), ctx.accounts.reward_data.key().as_ref()], ctx.program_id);

        if reward_mint != ctx.accounts.reward_mint.key() {
            return err!(ErrorCode::PDA);
        }
        
        let reward_data = &mut ctx.accounts.reward_data;
        reward_data.user = ctx.accounts.user.key();
        reward_data.reward_mint = ctx.accounts.reward_mint.key();
        reward_data.reward_bump = reward_bump;
        reward_data.reward_basis_points = reward_basis_points;

        msg!("Create Reward Token");

        Ok(())
    }

    pub fn redeem(ctx: Context<Redeem>, usdc_token: u64, reward_token: u64) -> Result<()> {

        let reward_data = ctx.accounts.reward_data.key();

        let seeds = &["MINT".as_bytes(), reward_data.as_ref(), &[ctx.accounts.reward_data.reward_bump]];
        let signer = [&seeds[..]];

        // transfer USDC to user
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.customer_usdc_token.to_account_info(),
                authority: ctx.accounts.customer.to_account_info(),
                to: ctx.accounts.user_usdc_token.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, usdc_token)?;
        msg!("Transfer USDC to Merchant");

        // mint or burn reward token
        let reward_amount = (ctx.accounts.reward_data.reward_basis_points.checked_mul(usdc_token).ok_or(ErrorCode::MATH)?).checked_div(10000).ok_or(ErrorCode::MATH)?;

        if reward_token > reward_amount {
            let cpi_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.reward_mint.to_account_info(),
                    from: ctx.accounts.customer_reward_token.to_account_info(),
                    authority: ctx.accounts.customer.to_account_info(),
                },
            );
            token::burn(cpi_ctx, reward_token - reward_amount)?;

        } else {
            // mint reward token to customer
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.reward_mint.to_account_info(),
                    to: ctx.accounts.customer_reward_token.to_account_info(),
                    authority: ctx.accounts.reward_mint.to_account_info(),
                },
                &signer,
            );

            token::mint_to(cpi_ctx, reward_amount - reward_token)?;
        }
        msg!("Mint Reward Token To Customer");

        Ok(())
    }       
}

#[derive(Accounts)]
pub struct CreateTokenReward<'info>{
     #[account(
        init,
        seeds = ["DATA".as_bytes().as_ref(), user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + 32 + 32 + 1 + 8
    )]
    pub reward_data: Account<'info, TokenData>,

    #[account(
        init,
        seeds = ["MINT".as_bytes().as_ref(), reward_data.key().as_ref()],
        bump,
        payer = user,
        mint::decimals = 6,
        mint::authority = reward_mint, 
        
    )]
    pub reward_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,

}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(
        seeds = ["DATA".as_bytes().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub reward_data: Account<'info, TokenData>,

    #[account(mut,
        seeds = ["MINT".as_bytes().as_ref(), reward_data.key().as_ref()],
        bump = reward_data.reward_bump
    )]
    pub reward_mint: Account<'info, Mint>,

    #[account(
        address = USDC_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub usdc_mint: Account<'info, Mint>,

    #[account(mut,
        constraint = customer_reward_token.mint == reward_mint.key(),
        constraint = customer_reward_token.owner == customer.key() 
    )]
    pub customer_reward_token: Account<'info, TokenAccount>,

    #[account(mut,
        constraint = customer_usdc_token.mint == usdc_mint.key(),
        constraint = customer_usdc_token.owner == customer.key()
    )]
    pub customer_usdc_token: Account<'info, TokenAccount>,

    #[account(mut,
        constraint = user_usdc_token.mint == usdc_mint.key(),
        constraint = user_usdc_token.owner == user.key()
    )]
    pub user_usdc_token: Account<'info, TokenAccount>,

    //TODO: validate account
    #[account(mut)]
    /// CHECK:
    pub user: AccountInfo<'info>,
    
    #[account(mut)]
    pub customer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}


#[account]
pub struct TokenData {
    pub user: Pubkey, // 32
    pub reward_mint: Pubkey, // 32
    pub reward_bump: u8, // 1
    pub reward_basis_points: u64 // 8

}

#[error_code]
pub enum ErrorCode {
    #[msg("PDA not match")]
    PDA,
    #[msg("Math Error")]
    MATH
}