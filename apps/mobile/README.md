# Ping Mobile App

React Native + Expo client for the Ping money network.

## Repo Position

This app is built by CI (matrix build per service) and shipped as part of the `bp-ping` Blueprint that deploys to the OpenOva Sovereign at `openova-io/openova-private`. See [../../docs/ARCHITECTURE.md § Infrastructure](../../docs/ARCHITECTURE.md#infrastructure-kubernetes) and [ADR 0006](../../docs/adr/0006-deployment-via-openova-sovereign.md).

The app talks to the Ping backend services running on the Sovereign — there is no local backend to run.

## Dev Loop (for UI work)

```bash
cd apps/mobile

# Standard simulator (iOS / Android) — points at the Sovereign dev environment by default
pnpm dev

# Tunnel mode — for testing on a physical phone behind a corporate VPN
# (uses localtunnel; see docs/RUNBOOKS.md § Network Configuration)
pnpm tunnel
```

The API base URL points at the Sovereign dev environment — configured via `app.json` `extra.apiUrl`, defaulting to `https://api.dev.ping.cash`. Override locally only for one-off UI testing — do not commit a different value.

## iOS Build Pipeline

iOS builds run in GitHub Actions. Because Expo iOS builds take ~20 min each and consume free private-repo minutes quickly, the Ping repo can be **temporarily flipped public** for build batches:

```bash
gh repo edit ping-cash/ping-cash --visibility public
# ... let CI run iOS builds ...
gh repo edit ping-cash/ping-cash --visibility private  # if you want to flip back
```

Secrets live in OpenBao on the Sovereign (not in the repo), so visibility toggling is safe. See [ADR 0006 § iOS Build Toggle](../../docs/adr/0006-deployment-via-openova-sovereign.md#ios-build-toggle).

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── phone.tsx
│   │   └── verify.tsx
│   └── (main)/
│       ├── home.tsx
│       ├── send.tsx
│       ├── contacts.tsx
│       └── history.tsx
├── components/
├── lib/
│   └── api.ts              # API client pointing at Sovereign dev/prod
├── hooks/
├── assets/
├── app.json
└── package.json
```

## Available Scripts

```bash
pnpm dev        # Expo dev server (simulator)
pnpm ios        # iOS simulator
pnpm android    # Android emulator
pnpm web        # Web preview (for rapid UI iteration)
pnpm tunnel     # Tunnel mode for physical-device testing
pnpm lint
pnpm typecheck
```

## Network Quirks

For testing on a physical phone behind a corporate VPN (the bastion's common setup), see [`../../docs/RUNBOOKS.md § Network Configuration`](../../docs/RUNBOOKS.md#network-configuration) — uses SSH SOCKS proxy + localtunnel.

## Debugging

- **Expo Go:** Shake device to open the developer menu
- **Logs:** Terminal running Expo
- **React Query DevTools:** Web mode only
- **Network:** Inspect via React Native Debugger or browser DevTools (web mode)

## Common Issues

| Symptom                   | Fix                                                                |
| ------------------------- | ------------------------------------------------------------------ |
| "Network Error" on device | Verify the phone reaches the Sovereign API URL; check VPN / tunnel |
| Metro bundler stuck       | `npx expo start --clear`                                           |
| TypeScript errors         | `pnpm typecheck`                                                   |
