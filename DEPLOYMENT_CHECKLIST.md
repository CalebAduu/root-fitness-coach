# Deployment Checklist

## Pre-Deployment

- [ ] All environment variables are set up
- [ ] RAG system is working locally
- [ ] All tests pass
- [ ] No sensitive data in code
- [ ] README is updated

## GitHub Setup

- [ ] Repository is created on GitHub
- [ ] Code is pushed to main branch
- [ ] .gitignore is properly configured
- [ ] No .env files are committed

## Vercel Deployment

- [ ] Connect GitHub repository to Vercel
- [ ] Add environment variables in Vercel dashboard:
  - [ ] `OPENAI_API_KEY`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` (if using)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (if using)
- [ ] Deploy and test all features
- [ ] Verify RAG system works in production

## Post-Deployment

- [ ] Test all pages load correctly
- [ ] Test AI chat functionality
- [ ] Test RAG Q&A system
- [ ] Test workout plan generation
- [ ] Check mobile responsiveness
- [ ] Monitor error logs

## Environment Variables Required

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Optional (if using Supabase):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
