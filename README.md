# Personal AI OS

A modern, full-stack foundation built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## 🚀 Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel with automatic deployments
- **Code Quality**: ESLint, Prettier, Husky, lint-staged
- **CI/CD**: GitHub Actions

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- OpenAI API key

### Environment Setup

1. Copy the environment template:

   ```bash
   cp env.template .env.local
   ```

2. Fill in your environment variables in `.env.local`:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Next.js Configuration
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000
   ```

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utility functions and configurations
│   │   ├── supabase/        # Supabase client configurations
│   │   └── utils.ts         # Utility functions
│   └── middleware.ts        # Next.js middleware for auth
├── .github/workflows/       # GitHub Actions CI/CD
├── .husky/                  # Git hooks
└── public/                  # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deployments will happen automatically on push to main

### Manual Deployment

```bash
npm run build
npm run start
```

## 🔐 Environment Variables

| Variable                        | Description                  | Required |
| ------------------------------- | ---------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL    | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key       | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key    | Yes      |
| `OPENAI_API_KEY`                | OpenAI API key               | Yes      |
| `NEXTAUTH_SECRET`               | NextAuth secret for sessions | Yes      |
| `NEXTAUTH_URL`                  | Your app URL                 | Yes      |

## 🧪 Development Workflow

1. **Code Quality**: Pre-commit hooks run ESLint and Prettier
2. **Type Safety**: TypeScript ensures type safety
3. **Testing**: CI/CD runs on every push and PR
4. **Deployment**: Automatic deployments to Vercel

## 📚 Next Steps

- Set up Supabase project and configure authentication
- Add your first components using shadcn/ui
- Implement your application logic
- Set up database schema in Supabase
- Configure storage buckets if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

# CI Status Update - Thu Oct 2 00:35:52 EDT 2025
