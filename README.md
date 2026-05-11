# Root Fitness Coach - AI-Powered Fitness Platform

A modern, AI-powered fitness coaching platform that provides personalized workout plans and nutrition guidance through intelligent chat interactions.

## ✨ Features

- **Beautiful Landing Page** - Modern, responsive design with hero section and features
- **AI Chat Onboarding** - Intelligent conversation-based user onboarding
- **Personalized Workout Plans** - AI-generated fitness routines tailored to your goals
- **RAG-Powered Q&A** - Ask questions about workouts and get intelligent answers
- **Nutrition Guidance** - Smart meal planning and dietary recommendations
- **Progress Tracking** - Monitor your fitness journey and achievements
- **Responsive Design** - Works perfectly on all devices

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd root-fitness-coach
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env.local file with your API keys
# See ENVIRONMENT_SETUP.md for details
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deployment to Vercel

This project is optimized for Vercel deployment:

1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Connect to Vercel**: 
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect Next.js and configure the build
3. **Environment Variables**: Add your environment variables in the Vercel dashboard
4. **Deploy**: Vercel will automatically deploy on every push to main branch

### Vercel Configuration

The project includes:
- `next.config.ts` - Optimized for Vercel
- Automatic API route handling
- Static asset optimization
- Edge runtime support

## 🏗️ Project Structure

```
root-fitness-coach/
├── app/                    # Next.js 13+ app directory
│   ├── api/               # API routes
│   │   ├── chat/          # AI chat endpoint
│   │   ├── generate-plan/ # Workout plan generation
│   │   └── submit-feedback/ # User feedback
│   ├── onboarding/        # Chat onboarding page
│   ├── workout-plan/      # Workout plan display
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── lib/                   # Utility libraries
│   ├── tools/             # AI tools and integrations
│   └── rag/               # RAG system for Q&A
├── public/                # Static assets
└── package.json           # Dependencies and scripts
```

## 🎨 Design Features

- **Modern UI/UX**: Clean, professional design with smooth animations
- **Responsive Layout**: Mobile-first approach with desktop optimization
- **Gradient Accents**: Beautiful color schemes and visual hierarchy
- **Interactive Elements**: Hover effects, loading states, and smooth transitions
- **Accessibility**: Proper contrast, focus states, and semantic HTML

## 🔧 Customization

### Colors and Themes
- Primary colors are defined in Tailwind config
- Easy to modify gradients and accent colors
- Consistent design system throughout

### Content
- Update hero text and features in `app/page.tsx`
- Modify chat prompts in the onboarding flow
- Customize workout plan templates

## 📱 Mobile Optimization

- Responsive grid layouts
- Touch-friendly button sizes
- Optimized chat interface for mobile
- Fast loading on all devices

## 🚀 Performance Features

- Next.js 13+ App Router
- Optimized images and assets
- Efficient API routes
- Minimal bundle size
- Fast page loads

## Pitch Deck
https://pitch.com/v/untitled-presentation-87n8ig

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support or questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the code examples

---

**Built with ❤️ using Next.js, Tailwind CSS, and AI-powered fitness coaching**
