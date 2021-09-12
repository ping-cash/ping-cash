# Sociable Cash

## Overview
Sociable Cash is a mobile wallet letting users to transfer tokens rapidly and simply by leveraging its decentralized identity directory services.

Unlike other crypto wallets Sociable Cash is not aimed to support multiple protocols or different variety of tokens which is a valid requirement for wallets that are used for investment and trading purposes.

Instead Sociable Cash is focused on transfering tokens in simplest, fastest and most affordable way by avoiding all the complexities and usability challanges.

Therefore Sociable Cash is built on top of Binance Smart Chain which provides rapid and low cost transfers by means of BEP20 protocol.

It is only meant to transfer BUSD token and Sociable Cash Token (SCH).

## Decentralized identity directory services
Combining decentralized identity directory services with a wallet is a unique idea where there is no other implementations yet. t.b.d.
- W3C DID
- Sovrin: Trinsic wallet is a mobile implementation on top of Sovrin Blockchain.
- Veramo
Any successful single sign on (Google, Facebook, Instagram, Twitther, SMS etc.) happening through the wallet will be saved as credententials in the self sovereign wallet as distributed identifier (DID)

## Tokenomics
SCH is designed to be a disinflationary token. Every month 25% of the profits will be used for buying back the tokens for burning. Buy back / burning process will keep proceeding until Max Supply drops down to half of the initial max supply.

## Allocation
| Type                  | Percent |
|-----------------------|---------|
| ICO                   | 50%     |
| Private Investors     | 15%     |
| Foundation / LP       | 20%     |
| Rewards / Airgap      | 15%     |

Tokens reserved for founding team and investors will be locked and will be relased gradually proportional to the burned tokens every month. The only unlocked initial Foundation tokens will be limited to 5% for initializing the BUSD/SCH liquidity pool.

## Supply

| Phase    | Max                 | Total               | Circulating                    |  Locked                 | Remaining              |
|----------|---------------------|---------------------|--------------------------------|-------------------------|------------------------|
| Initial  | 400,000,000         | 350,000,000         | 220,000,000                    |  130,000,000            |  50,000,000            |
| Interim  | 400,000,000 - burnt | 350,000,000 - burnt | 220,000,000 + emission - burnt |  130,000,000 - unlocked |  50,000,000 - emission |
| Final    | 200,000,000         | 200,000,000         | 200,000,000                    |  0                      |  0                     |

## ICO Schedule
| Week | Price   |
|------|---------|
| 1st  | $ 0.008 |
| 2nd  | $ 0.009 |
| 3rd  | $ 0.010 |

## Revenue Model
Transfer (Deposit / Withdrawal) fees. Fees will be discounted when they are paid by SCH.

| Max Supply    | Discount |
|---------------|----------|
| > 350,000,000 | 75%      |
| > 300,000,000 | 50%      |
| > 250,000,000 | 25%      |
| > 200,000,000 | 0%       |

## Funds Usage
| Usage                                | Percent |
|--------------------------------------|---------|
| Development and Maintenance          | 30%     |
| Marketting / Rewards                 | 40%     |
| Initial Liquidity Pool               | 10%     |
| Reserved                             | 20%     |

## Liquidity Pool
Sociable Cash will have its own SCH/BUSD balanced liquidity pool pair. Liquity providers will be rewarded with SCH. Sociable Cash platform will always ensure there would be enough amount of liquidity in the pool.

## SCH Reward Structure
- Airgaps for the new joiners and refferrers.
- Liquity Pool Rewards
- Locked and Flexible Staking Rewards
- Compensation of Visa Costs from the marketting budget till the end of Phase-3 for SCH hodlers.
- Access to features on Sociable Platforms

## Early withdrawal penalty
Applied for locked staking.
t.b.d

## Long Term Price Drivers


## Integrations
| Phases | Integrations.              | Target          |
|--------|----------------------------|-----------------|
| 0      | Standalone Sociable.Cash   | 2021 Q4         |
| 1      | Sociable.Games Payments    | 2022 Q1         |
| 2      | Sociable.Travel Payments   | 2022 Q3         |
| 3      | Various other platforms    | 2022 Q4 Onwards |

## Device Coverage
iOS and Android devices

## Languages
English first, multi lingual.

## Open Source Wallet Alternatives

### Bitpay 
Bitpay is a the simple mobile wallet alternative to take as a reference for technical knowhow gathering purpose. It is lack of BSC and Directory capabilities, but it has the ApplePay and Credit card payment features which can be cloned. We'll investigate Bitpay in detail to identify how they were able to overcome regulatory requirements despite they do not collect identification information from the end user. (https://github.com/bitpay/wallet)

### TrustWallet 
Trustwallet is much more sophisticated mobile wallet in terms of variety of supported protocols and tokens. But it doesn't have any payment and withdrawal gateway (https://github.com/trustwallet/wallet-core)

## Crypto.com

Crypto.com is a very sophisticated centralized mobile application (not a wallet) which has directory services as well. It provides credit card purchase and even it has its own visa credit card for spending purposes. It requires authorization of users with identification documents and face biometrics. The registration process is not instant, it requires 1-3 days approval. It doesn't have NFC capability to transfer tokens. It only imports phone contacts and do not consider social media contacts. It doesn't support tranfering BUSD. This application should be considered as a competitor for Binance or Coinbase Exchanges and their applications. Crypto.com has it own Defi Wallet as well but the Defi Wallet is lack of above mentioned capabilities.

## References
https://docs.binance.org/index.html

https://docs.binance.org/smart-chain/developer/BEP20.html

https://github.com/ObsidianLabs/bsc-dapp-tutorial/blob/master/README.EN.md
