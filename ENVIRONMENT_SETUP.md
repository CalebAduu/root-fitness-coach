# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# OpenAI API Key (required for RAG system)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (if using database features)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL (if using)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key (if using)

## For Local Development

1. Copy `.env.local` from your existing setup
2. Ensure all required variables are set
3. Run `npm run dev` to start development server
