use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::{
    extension::{BaseStateWithExtensions, ExtensionType, StateWithExtensions},
    state::Mint as SplMint,
};
use anchor_spl::token_interface::{Mint, TokenInterface};

declare_id!("PingTokenProgr4mPubKeyP1ace00011111111111111");

pub const PING_DECIMALS: u8 = 9;

/// Token-2022 extensions allow-list per ADR 0008. Anything NOT in this list
/// causes initialize_mint to revert with UnsafeExtension.
/// Pre-audit finding C-02 (2026-05-24, #22 c.4527049794) — without this check
/// a hostile mint could carry PermanentDelegate / TransferHook /
/// DefaultAccountState::Frozen / MintCloseAuthority / TransferFeeConfig /
/// InterestBearingConfig / NonTransferable / ConfidentialTransferMint /
/// GroupPointer / GroupMemberPointer and this program would happily certify it.
const ALLOWED_EXTENSIONS: &[ExtensionType] = &[
    ExtensionType::MetadataPointer,
    ExtensionType::TokenMetadata,
];

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

        // Pre-audit C-02 remediation: deserialize raw mint data with extensions
        // and reject anything outside the allow-list. InterfaceAccount<Mint>
        // gives us the base mint fields but does NOT enforce extension hygiene.
        let mint_account_info = ctx.accounts.mint.to_account_info();
        let mint_data = mint_account_info.try_borrow_data()?;
        let mint_with_ext = StateWithExtensions::<SplMint>::unpack(&mint_data)
            .map_err(|_| error!(PingTokenError::MintParseFailed))?;
        for ext in mint_with_ext.get_extension_types()
            .map_err(|_| error!(PingTokenError::MintParseFailed))?
        {
            require!(
                ALLOWED_EXTENSIONS.contains(&ext),
                PingTokenError::UnsafeExtension
            );
        }

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
    /// Pre-audit H-01 remediation: PDA seed binds to mint.key() so the Registry
    /// slot is one-per-mint, not a single global first-come slot. A front-runner
    /// would have to bring their OWN hostile mint to claim a Registry — and that
    /// mint would still fail decimals + freeze + authority + extension checks.
    #[account(
        init,
        payer = payer,
        space = Registry::LEN,
        seeds = [b"ping-registry", mint.key().as_ref()],
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
    #[msg("Mint extensions could not be parsed (Token-2022 deserialize failed)")]
    MintParseFailed,
    #[msg("Mint carries a Token-2022 extension outside the ADR 0008 allow-list (only MetadataPointer + TokenMetadata permitted)")]
    UnsafeExtension,
}
