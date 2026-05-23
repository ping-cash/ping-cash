use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

declare_id!("PingTokenProgr4mPubKeyP1ace00011111111111111");

pub const PING_DECIMALS: u8 = 9;

#[program]
pub mod ping_token {
    use super::*;

    /// Initialize the $PING SPL Token-2022 mint.
    ///
    /// Mint authority = Foundation Squads multisig (passed in).
    /// Freeze authority = None (no freeze ever, per ADR 0008).
    /// No transfer-fee extension at mint init.
    pub fn initialize_mint(ctx: Context<InitializeMint>, squads_multisig: Pubkey) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.mint = ctx.accounts.mint.key();
        registry.mint_authority = squads_multisig;
        registry.decimals = ctx.accounts.mint.decimals;
        registry.bump = ctx.bumps.registry;

        require!(
            ctx.accounts.mint.decimals == PING_DECIMALS,
            PingTokenError::WrongDecimals
        );
        require!(
            ctx.accounts.mint.mint_authority.is_some()
                && ctx.accounts.mint.mint_authority.unwrap() == squads_multisig,
            PingTokenError::WrongMintAuthority
        );
        require!(
            ctx.accounts.mint.freeze_authority.is_none(),
            PingTokenError::FreezeAuthorityMustBeNone
        );

        emit!(MintInitialized {
            mint: ctx.accounts.mint.key(),
            mint_authority: squads_multisig,
            decimals: ctx.accounts.mint.decimals,
        });
        Ok(())
    }
}

#[account]
pub struct Registry {
    pub mint: Pubkey,
    pub mint_authority: Pubkey,
    pub decimals: u8,
    pub bump: u8,
}

impl Registry {
    pub const LEN: usize = 8 + 32 * 2 + 1 + 1;
}

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = Registry::LEN,
        seeds = [b"ping-registry"],
        bump
    )]
    pub registry: Account<'info, Registry>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct MintInitialized {
    pub mint: Pubkey,
    pub mint_authority: Pubkey,
    pub decimals: u8,
}

#[error_code]
pub enum PingTokenError {
    #[msg("$PING mint must have 9 decimals")]
    WrongDecimals,
    #[msg("Mint authority must equal supplied squads_multisig")]
    WrongMintAuthority,
    #[msg("Freeze authority must be None (no freeze ever per ADR 0008)")]
    FreezeAuthorityMustBeNone,
}
