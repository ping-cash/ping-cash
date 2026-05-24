use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::{
    extension::{BaseStateWithExtensions, ExtensionType, StateWithExtensions},
    instruction::AuthorityType,
    state::Mint as SplMint,
};
use anchor_spl::token_interface::{set_authority, Mint, SetAuthority, TokenInterface};

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
        registry.version = Registry::CURRENT_VERSION;
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

    /// Renounce the $PING mint authority permanently. Required for ADR 0008's
    /// Y5 zero-emissions endgame: after the final halving + Foundation-controlled
    /// emission completes, calling this sets mint_authority = None forever (no
    /// further $PING can ever be minted). Irreversible.
    ///
    /// Caller must be the current mint_authority (Squads multisig). CPI to
    /// spl-token-2022 SetAuthority instruction with AuthorityType::MintTokens
    /// and new_authority = None.
    ///
    /// Pre-audit finding H-03 (#22 c.4527049794): without this, the only way
    /// to reach the zero-emissions endgame is for Squads to misplace its keys.
    pub fn renounce_mint_authority(ctx: Context<RenounceMintAuthority>) -> Result<()> {
        // Sanity-check: registry's recorded mint_authority must match the signer
        // who's calling this. Belt-and-braces alongside Anchor's signer check.
        require!(
            ctx.accounts.registry.mint_authority == ctx.accounts.mint_authority.key(),
            PingTokenError::WrongMintAuthority
        );

        set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                    current_authority: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            AuthorityType::MintTokens,
            None,
        )?;

        let registry = &mut ctx.accounts.registry;
        registry.mint_authority = Pubkey::default(); // record the renounce in the Registry

        emit!(MintAuthorityRenounced {
            mint: ctx.accounts.mint.key(),
            renounced_by: ctx.accounts.mint_authority.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct RenounceMintAuthority<'info> {
    #[account(
        mut,
        seeds = [b"ping-registry", mint.key().as_ref()],
        bump = registry.bump,
        has_one = mint,
    )]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    /// Current mint authority (Squads multisig signer in production).
    pub mint_authority: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
pub struct Registry {
    /// Storage layout version. Bump on incompatible field changes; future
    /// migration instructions branch on this value. Pre-audit C-01 fix
    /// (#22 c.4527049794) — original struct had no version discriminant
    /// so any future schema change would require a fresh PDA + data copy
    /// + lookup-table swap. With a version byte, migrations can read
    /// existing accounts in-place.
    pub version: u8,
    pub mint: Pubkey,
    pub mint_authority: Pubkey,
    pub decimals: u8,
    pub bump: u8,
}

impl Registry {
    pub const CURRENT_VERSION: u8 = 1;
    // 8 disc + 1 version + 32 mint + 32 mint_authority + 1 decimals + 1 bump = 75
    pub const LEN: usize = 8 + 1 + 32 * 2 + 1 + 1;
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

#[event]
pub struct MintAuthorityRenounced {
    pub mint: Pubkey,
    pub renounced_by: Pubkey,
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
