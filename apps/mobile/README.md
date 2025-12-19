# Cash Mobile App

React Native app built with Expo for the Cash remittance platform.

## Prerequisites

- Node.js 20+
- pnpm 9+
- [Expo Go](https://expo.dev/go) app on your phone (iOS or Android)
- Backend services running (see below)

## Development Setup

### 1. Start Backend Services

From the project root:

```bash
# Start infrastructure (PostgreSQL, MongoDB, Redis, Redpanda)
docker compose up -d

# Start backend services (when implemented)
pnpm dev
```

### 2. Configure API URL

The mobile app needs to connect to the backend API. The configuration depends on how you're running the app.

#### Option A: Simulator/Emulator (localhost)

Default configuration works out of the box:

```typescript
// lib/api.ts uses localhost:3001 by default for __DEV__
```

#### Option B: Physical Device (Expo Go)

You need your development machine's IP address:

```bash
# Find your IP
# macOS:
ipconfig getifaddr en0

# Linux:
hostname -I | awk '{print $1}'

# Windows:
ipconfig | findstr IPv4
```

Then update `lib/api.ts`:

```typescript
// In getBaseUrl() function, change:
return 'http://YOUR_IP_HERE:3001';
```

Or set it via environment variable in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://YOUR_IP_HERE:3001"
    }
  }
}
```

### 3. Start Expo Development Server

```bash
cd apps/mobile

# Standard mode (for simulators or same network)
pnpm dev

# Tunnel mode (for physical devices on different network)
pnpm tunnel
```

### 4. Connect Expo Go

1. Open Expo Go on your phone
2. Scan the QR code shown in terminal
3. App loads on your device

## Port Mapping (Vagrant VM)

If running backend in Vagrant VM, ensure ports are forwarded in `Vagrantfile`:

```ruby
config.vm.network "forwarded_port", guest: 3001, host: 3001  # auth-service
config.vm.network "forwarded_port", guest: 3002, host: 3002  # transfer-service
config.vm.network "forwarded_port", guest: 3003, host: 3003  # claim-service
config.vm.network "forwarded_port", guest: 5433, host: 5433  # postgres
config.vm.network "forwarded_port", guest: 27017, host: 27017 # mongodb
config.vm.network "forwarded_port", guest: 6379, host: 6379  # redis
config.vm.network "forwarded_port", guest: 8080, host: 8080  # redpanda console
```

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home screen
│   ├── (auth)/            # Auth flow screens
│   │   ├── _layout.tsx
│   │   ├── phone.tsx      # Phone input
│   │   └── verify.tsx     # OTP verification
│   └── (main)/            # Main app screens
│       ├── _layout.tsx
│       ├── home.tsx       # Balance & actions
│       ├── send.tsx       # Send money flow
│       ├── contacts.tsx   # Contact list
│       └── history.tsx    # Transfer history
├── components/            # Reusable components
│   ├── ui/               # Design system
│   └── ...
├── lib/
│   ├── api.ts            # API client
│   └── ...
├── hooks/                # Custom hooks
├── assets/               # Images, fonts
├── app.json              # Expo config
└── package.json
```

## Available Scripts

```bash
pnpm dev        # Start Expo dev server
pnpm ios        # Start on iOS simulator
pnpm android    # Start on Android emulator
pnpm web        # Start web version
pnpm tunnel     # Start with tunnel (for devices outside network)
pnpm lint       # Run ESLint
pnpm typecheck  # Run TypeScript check
```

## Testing Workflow

### Quick UI Testing

For rapid UI iteration without backend:

1. Mock the API responses in `lib/api.ts`
2. Run `pnpm dev` or `pnpm web`
3. Use web browser for fast reload

### Full Integration Testing

1. Start all backend services
2. Configure correct API URL
3. Run `pnpm dev` and scan QR with Expo Go
4. Test complete flows (auth, transfer, etc.)

### Debugging

- **Expo Go**: Shake device to open developer menu
- **Console Logs**: Visible in terminal running Expo
- **React Query DevTools**: Available in web mode
- **Network Requests**: Use React Native Debugger or Flipper

## Common Issues

### "Network Error" on Device

- Ensure your phone and dev machine are on same network
- Check firewall isn't blocking the port
- Verify API URL has correct IP (not localhost)

### Metro Bundler Stuck

```bash
# Clear cache and restart
npx expo start --clear
```

### TypeScript Errors

```bash
pnpm typecheck
```

## Environment Variables

For production builds, configure via `eas.json` or CI/CD:

| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Backend API base URL | `https://api.cash.app` |
| `SENTRY_DSN` | Error tracking | `https://xxx@sentry.io/xxx` |
