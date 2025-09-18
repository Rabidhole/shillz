# Shillz - Crypto Token Shilling Platform

A real-time crypto token shilling and leaderboard platform built with Next.js, TypeScript, and Supabase.

## Features

- Real-time token shilling and voting system
- Multi-chain wallet integration
- User tiers based on shilling activity
- Live leaderboards with various timeframes
- Telegram integration
- Token categorization and filtering
- Instant updates via WebSocket

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **UI Components**: shadcn/ui
- **Database & Real-time**: Supabase
- **Wallet Integration**: ReOwn AppKit
- **Form Handling**: React Hook Form, Zod
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env.local` and fill in your environment variables
4. Run the development server:
   ```bash
   pnpm dev
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Next Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database Schema

### Tables

1. **users**
   - id (uuid, primary key)
   - telegram_username (text)
   - wallet_address (text)
   - tier (enum: degen, chad, mofo, legend)
   - total_shills (int)
   - created_at (timestamp)

2. **tokens**
   - id (uuid, primary key)
   - name (text)
   - contract_address (text)
   - chain (text)
   - description (text)
   - image_url (text)
   - total_shills (int)
   - created_at (timestamp)

3. **shills**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - token_id (uuid, foreign key)
   - created_at (timestamp)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT