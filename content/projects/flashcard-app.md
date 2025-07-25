---
title: 'Flashcard App - Technical Documentation'
description: 'Comprehensive technical documentation for the modern flashcard application with SRS (Spaced Repetition System) implementation, AI-powered flashcard generation, and Pro subscriptions.'
lastUpdated: '2025-07-23'
author: 'Fx64b'
status: 'published'
projectSlug: 'flashcard-app'
version: '1.11.0'
readTime: '18 mins'
---

# Flashcard App - Technical Documentation

## Overview

The Flashcard App is a modern web application designed for effective learning using the Spaced Repetition System (SRS). Built with [Next.js 15](https://nextjs.org/), [TypeScript](https://www.typescriptlang.org/), and [Turso database](https://turso.tech/), it provides users with a powerful platform for creating, managing, and studying flashcards. Now with AI-powered flashcard generation and a full subscription system.

What started as a quick project for my final general education exam turned into something much more ambitious. The app implements a proper SRS algorithm (borrowed heavily from Anki's approach), supports multiple languages, includes AI-powered flashcard generation that actually works pretty well, and has a complete subscription system with Stripe integration.

Honestly, it's definitely over-engineered for what I initially needed, but where's the fun in building something simple? Plus, now other people are actually using it, which is both exciting and terrifying.

## Project History & Vision

### The Idea

The whole thing started because I needed to study for my final exams and wasn't particularly happy with the existing flashcard apps out there. Anki is powerful but feels ancient, and most modern alternatives either cost too much, are bloated with ads, or lack the sophisticated spaced repetition that actually makes flashcards effective.

So naturally, instead of just using what was available, I decided to build my own. It was the perfect opportunity to procrastinate a little longer before I actually had to start studying.

### Development Journey

Initially, this was meant to be a quick proof of concept - just enough to get through my exams. But as often happens with side projects, it grew legs and started walking on its own.

The first version was pretty rough. I had database logic scattered throughout components, inconsistent statistics calculations, and way too many `console.log` statements that I forgot to remove.

Then I got carried away and added AI-powered flashcard generation. Because apparently what a simple flashcard app really needed was machine learning integration. The AI stuff was initially 100% generated by AI (ironic, I know), but it actually did a surprisingly good job. I've since refined it significantly.

The subscription system came next when I realized that AI API calls aren't free, and neither is hosting. So now there's a whole Stripe integration with payment recovery emails and billing portals. Because nothing says "simple study tool" like a complete SaaS business model.

Over time, I've been slowly refactoring the technical debt from that initial rush job. It's still not perfect (more on that later), but it's actually become quite robust.

### Current State

As of version 1.11.0, the app includes:

- Proper SRS implementation with SuperMemo-2 algorithm
- Multi-language support (English and German)
- AI-powered flashcard generation from text or PDF documents
- Complete subscription system with Pro features
- Progress tracking and detailed analytics
- Export/import functionality
- Payment recovery and billing management

It's deployed on Vercel and actually works pretty well. I use it regularly, along with a growing number of other users, which I guess is the ultimate test for any personal project.

### Future Vision

The goal is to create a flashcard app that doesn't suck. Something that combines the sophistication of Anki with a modern, intuitive interface, plus some AI magic to make creating quality flashcards easier.

I want it to be powerful enough for serious learners but simple enough that you don't need to learn how the software works first. The AI integration should feel natural, not gimmicky, and the subscription model should provide real value while keeping core features accessible.

## Architecture Overview

### High-Level Architecture

This is a pretty standard [Next.js](https://nextjs.org/) application with server-side rendering and server actions. I chose to keep everything in a single codebase rather than splitting into separate frontend and backend services, mainly because hosting is so much easier when you only have one thing to deploy.

The architecture now looks something like this:

```txt
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Server Actions │    │   Database      │
│   (React/Next)  │◄──►│   (Next.js API)  │◄──►│   (Turso)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  External APIs   │
                          │ Stripe, Google   │
                          │ AI, Resend, etc. │
                          └──────────────────┘
```

### Component Structure

I tried to follow a pretty standard React pattern:

- **Pages** handle routing and data fetching
- **Components** are (mostly) reusable UI pieces
- **Server Actions** handle all the business logic
- **Utils** contain shared functionality
- **Lib** contains integrations with external services

There's still some technical debt where I have database logic directly in components from the initial proof of concept, but I'm slowly cleaning that up. The AI and Stripe integrations forced me to be more disciplined about separation of concerns.

### Data Flow

Data flows through server actions, which is honestly one of my favorite things about Next.js 15. No need to set up API routes for everything - you can just call server functions directly from your components.

The pattern is simple: user interacts with UI, component calls server action, server action handles business logic and database operations (plus any external API calls), then the UI updates with new data.

For the AI features, there's an additional step where the server action calls Google's Gemini API, processes the response, and then creates flashcards from the results.

### State Management

I keep client-side state pretty minimal. Most data lives in the database and gets fetched fresh when needed. For the few things that need client-side state (like user preferences, animations, and form states), I use [Zustand](https://zustand-demo.pmnd.rs/) with localStorage persistence.

The subscription status is cached client-side to avoid repeated API calls, but it refreshes when needed.

## Core Features

### Deck Management

Users can create and organize flashcards into decks. Each deck has:

- Title and description
- Category for organization
- Optional due date for exam preparation
- Progress tracking
- AI generation capabilities (for Pro users)

The deck creation process is straightforward - you fill out a form, and it creates a new deck. Pro users get an additional AI tab for generating flashcards automatically.

### Flashcard Creation & Editing

There are now four ways to create flashcards:

1. **Single card creation** - The traditional one-at-a-time approach
2. **Bulk JSON import** - For when you have a lot of cards to add
3. **AI generation from text** - Describe what you want to learn, and AI creates the cards
4. **AI generation from PDF** - Upload a document, and AI extracts key concepts into flashcards

The bulk import was added because manually creating dozens of cards gets tedious fast. You just paste in a JSON array with your cards, and it processes them all at once.

The AI generation turned out to be one of the most popular features. It uses Google's Gemini model with carefully crafted prompts to create educational flashcards. The quality is surprisingly good, though it occasionally needs some human review.

### Learning System

This is where the magic happens. The app uses a spaced repetition algorithm based on SuperMemo-2. When you review a card, you rate it from 1-4:

- **1 (Again)** - You got it wrong, see it again soon
- **2 (Hard)** - You got it right but struggled
- **3 (Good)** - You got it right with normal effort
- **4 (Easy)** - You knew it immediately

The algorithm then calculates when you should see that card next, spacing out reviews over increasingly longer intervals.

### Progress Tracking

The app tracks various statistics including daily review counts, success rates, learning streaks, time-of-day analysis, and cards by difficulty level.

I'll be honest - the statistics code was a nightmare for a while. I had inconsistent filtering logic scattered everywhere, which led to weird edge cases where the numbers didn't add up. It's mostly fixed now, but this is definitely an area where the initial proof-of-concept approach bit me.

### Study Sessions

Study sessions track your learning activity, including start and end times, number of cards reviewed, and whether the session was completed. There's some auto-save functionality to handle cases where you close the browser mid-session, though I'm not 100% confident it works perfectly in all edge cases.

### Subscription System

The app now includes a complete Pro subscription system:

- **Free Plan**: Core flashcard functionality with manual creation
- **Pro Plan**: Unlimited AI generation, advanced analytics, priority support
- **Billing Management**: Stripe-powered checkout, billing portal, automatic payment recovery

The subscription gating is implemented throughout the app, with Pro features clearly marked and gracefully degraded for free users.

## Technical Stack

### Frontend

- **[Next.js 15](https://nextjs.org/)** - The main framework. I really like how development feels with Next.js, even if it's probably overkill for some projects.
- **[TypeScript](https://www.typescriptlang.org/)** - With strict type checking (though I still have some untyped areas that need cleanup)
- **[Tailwind CSS](https://tailwindcss.com/)** - For styling. Combined with some custom CSS for animations.
- **[Framer Motion](https://www.framer.com/motion/)** - For the flashcard flip animations and transitions
- **[shadcn/ui](https://ui.shadcn.com/)** - Component library for consistent UI elements

### Backend

- **[Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)** - Instead of building a separate API
- **[Drizzle ORM](https://orm.drizzle.team/)** - Turned out to be a solid choice, even if it caused a few hours of debugging frustration initially.
- **[NextAuth.js](https://next-auth.js.org/)** - For authentication via magic email links

### Database

- **[Turso (libSQL)](https://turso.tech/)** - SQLite-compatible database that scales
- **Drizzle migrations** - For schema management

I chose Turso because it's basically SQLite but hosted, which gives you the simplicity of SQLite with the convenience of not having to manage your own database server.

### External Services

- **[Google Generative AI (Gemini)](https://ai.google.dev/)** - For AI-powered flashcard generation
- **[Stripe](https://stripe.com/)** - Complete payment processing, subscriptions, and billing
- **[Resend](https://resend.com/)** - For sending authentication and payment-related emails
- **[Upstash Redis](https://upstash.com/)** - Rate limiting and caching
- **[Vercel](https://vercel.com/)** - Hosting and deployment

## AI Integration

### Current Implementation

The AI features are now fully implemented and working well:

**What Works:**
- Generate flashcards from text prompts with high quality
- PDF upload and processing with content extraction
- Smart prompt engineering that creates educational flashcards
- Rate limiting to prevent abuse and manage costs
- Content validation to ensure appropriate educational material

**Technical Details:**
- Uses Google's Gemini-1.5-Flash model (good balance of quality and cost)
- Custom system prompts optimized for educational content
- PDF processing with text extraction and cleanup
- Duplicate detection and removal
- Security validation of AI responses

**Rate Limiting:**
- Free users: No AI access (encourages subscriptions)
- Pro users: 50 generations per hour
- Grace period users: 10 per hour (for payment issues)
- Limited users: 5 per hour (suspended subscriptions)

The AI implementation was initially 100% generated by AI (ironic, I know), but I've significantly refined it. The prompt engineering took quite a bit of tweaking to get consistently good results.

### Challenges & Solutions

**Challenge**: AI sometimes generated too many or too few cards
**Solution**: Added explicit limits and better prompt instructions

**Challenge**: Inconsistent card quality  
**Solution**: Improved system prompts with specific guidelines and examples

**Challenge**: PDF processing was unreliable
**Solution**: Added timeout handling, better error recovery, and content validation

**Challenge**: Cost management
**Solution**: Tiered rate limiting based on subscription status

### Future AI Improvements

- Better prompt engineering for specific subjects
- Support for more file formats (DOCX, TXT, etc.)
- AI-powered study recommendations
- Content difficulty assessment

## Payment Integration

### Stripe Implementation

The Stripe integration is now fully implemented and handling real transactions:

**What's Working:**
- Monthly and yearly Pro subscriptions ($4.99/month or $49.99/year)
- Secure checkout flow with automatic tax calculation
- Billing portal for subscription management
- Webhook handling for all subscription events
- Automatic payment recovery system
- Prorated plan changes

**Technical Architecture:**
- Server actions for checkout session creation
- Webhook endpoints for subscription events
- Secure error handling that doesn't leak sensitive data
- Rate limiting on payment endpoints
- Customer data synchronization with local database

**Payment Recovery:**
The payment recovery system is probably over-engineered, but it works:
- Automatic retries for failed payments
- Grace period with limited access
- Email notifications at different stages
- Automatic restoration when payment succeeds

### Subscription Management

Users can:
- Upgrade to Pro from any page
- Manage billing through Stripe's customer portal
- Change between monthly/yearly plans
- Cancel subscriptions (with end-of-period access)
- Update payment methods

The billing portal integration saves a ton of development time - Stripe handles all the complex billing scenarios.

### Security Considerations

- All webhook events are verified with Stripe signatures
- Sensitive data is never logged or exposed in error messages
- Rate limiting prevents abuse of payment endpoints
- Customer data is encrypted in transit and at rest

### Revenue Model

The business model is straightforward:
- Free plan covers basic functionality
- Pro plan unlocks AI features and advanced analytics
- Pricing is competitive with other flashcard apps
- Annual subscriptions get a significant discount

It's actually generating meaningful revenue now, which is both exciting and slightly terrifying from a "now I have actual responsibilities" perspective.

## Database Schema

### Core Tables

The database schema has evolved but remains pretty straightforward:

**Users & Auth** (handled by NextAuth):
- `users` - Basic user information
- `accounts`, `sessions`, `verificationTokens` - Auth-related tables

**Learning Content:**
- `decks` - Collections of flashcards
- `flashcards` - Individual cards with front/back content
- `card_reviews` - Current state of each card's review schedule
- `review_events` - Historical record of all reviews

**Analytics:**
- `study_sessions` - Tracking learning sessions
- `user_preferences` - UI preferences and settings

**Business:**
- `subscriptions` - Stripe subscription data and status
- `users` table extended with subscription fields

### New Fields for Subscriptions

Added subscription-related fields to track:
- Stripe Customer ID
- Current subscription status
- Plan details and billing cycle
- Payment method status
- Grace period tracking

### Relationships

The relationships are pretty standard. Users have many decks, decks have many flashcards, flashcards have many review events, users have review history for cards, and users have subscription data.

The subscription data is tightly coupled with user accounts to ensure consistent access control.

### Indexes & Performance

I've added indexes on the most commonly queried fields:
- User ID (for obvious reasons)
- Next review dates (for finding due cards)
- Deck associations
- Review timestamps
- Subscription status fields

Performance is generally good, though I haven't done serious load testing with paying customers. SQLite is pretty fast for this kind of workload, and Turso handles the scaling.

### Migration Strategy

Database migrations are handled by Drizzle. When you want to add a field to a table, you extend the schema in code and generate new SQL migration files. Then you run the migration to safely apply changes to the actual database.

The subscription features required several migrations to add new tables and fields. It's a clean approach, though I did spend some frustrated hours debugging migration issues early on when I didn't fully understand how Drizzle worked.

## Authentication & Security

### NextAuth.js Implementation

Authentication uses [NextAuth.js](https://next-auth.js.org/) with email-only login (no passwords). Users get a magic link sent to their email, click it, and they're logged in. It's simple and secure - no passwords to forget or leak.

The session data now includes subscription status for efficient access control throughout the app.

### Session Management

Sessions are JWT-based and handled entirely by NextAuth. The session includes the user ID and some subscription metadata, which is all we really need for most operations.

### Rate Limiting

I've implemented comprehensive rate limiting using [Upstash Redis](https://upstash.com/) to prevent abuse:
- Email sending (5 emails per 15 minutes)
- AI generation (based on subscription tier)
- Bulk operations (10 per hour)
- Payment operations (strict limits)
- General API usage (100 per hour)

The rate limiting saved me when I accidentally created an infinite loop during development that was sending hundreds of emails. It also keeps AI costs under control.

### Security Headers

The app includes standard security headers like CSP (Content Security Policy), X-Frame-Options, X-XSS-Protection, and HSTS (HTTP Strict Transport Security). These are configured in the middleware and help protect against common web vulnerabilities.

### Data Protection

User data is isolated by user ID in all database queries. Server actions verify the user's session before performing any operations. Subscription data is carefully protected and never exposed in error messages.

Payment data is handled entirely by Stripe - we never store sensitive payment information locally.

### Content Security

AI-generated content goes through security validation to prevent injection attacks or inappropriate content. There are also content filters and length limits to ensure quality.

## Spaced Repetition System (SRS)

### Algorithm Implementation

After some research (and prompting AI), I went with the SuperMemo-2 algorithm. I'm not skilled enough yet to implement SRS algorithms cleanly from scratch, so I had AI generate most of this initially (and it did a surprisingly good job).

The implementation has been refined over time and now handles edge cases much better.

### How It Works

When you review a card, the algorithm calculates:

1. **Ease Factor** - How "easy" the card is (starts at 2.5)
2. **Interval** - Days until next review
3. **Next Review Date** - When you'll see it again

The ease factor adjusts based on your rating:
- Rating 1 (Again): Decreases ease and resets the interval
- Rating 2 (Hard): Slightly decreases ease with a modest interval increase
- Rating 3 (Good): Maintains ease with normal interval calculation
- Rating 4 (Easy): Increases ease with a longer interval

### Review Scheduling

New cards start with a 1-day interval. As you successfully review them, the intervals get longer: 1 day → 3 days → 8 days → 20 days → 48 days, etc.

The exact intervals depend on the ease factor and your performance on that specific card.

### Performance Metrics

The system tracks various metrics to help users understand their progress:
- Cards due for review
- Success rates by difficulty
- Learning streaks
- Time spent studying
- AI-generated vs manually created card performance

Some of these calculations were buggy for a while due to inconsistent filtering logic, but they're mostly cleaned up now. Pro users get more detailed analytics.

## Internationalization

### Next-intl Setup

The app supports English and German using [next-intl](https://next-intl-docs.vercel.app/). The setup is pretty standard - you have message files for each language, and the library handles the rest.

### Language Support

Currently supports:
- **English** - Primary language
- **German** - Secondary language (since I'm German and it was easy to add)

Adding more languages is just a matter of creating new translation files and updating the language selector. The AI-generated content is currently English-only, but could be localized.

### Locale Management

User language preferences are stored in the database for authenticated users, and in cookies for guests. The locale is determined in this order:

1. User's saved preference (if logged in)
2. Cookie value
3. Browser language detection
4. Default to English

### Translation Workflow

Translations are stored in JSON files under `/messages/`. When I need to add new text, I add it to the English file and then create the German translation.

It's a manual process right now, which doesn't scale great, but it works for the current size of the app. The subscription and AI features required quite a few new translation strings.

## User Experience & Interface

### Design System

The UI uses a consistent design system built on top of [shadcn/ui](https://ui.shadcn.com/) components and [Tailwind CSS](https://tailwindcss.com/).
I went for a clean, modern look that doesn't get in the way of learning.

The design philosophy is "functional first, pretty second." It needs to work well before it needs to look amazing. The subscription UI follows the same philosophy - clear value proposition without being pushy.

### Responsive Design

The app works on mobile, tablet, and desktop. The flashcard interface is optimized for touch interactions on mobile devices. The AI generation interface adapts well to different screen sizes.

I spent way too much time getting the card flip animations to work properly on different screen sizes, but it was worth it for the satisfying interaction.

### Accessibility

Basic accessibility features are implemented:
- Keyboard navigation for flashcard reviews
- Proper ARIA labels
- Color contrast compliance
- Screen reader friendly subscription status

There's definitely room for improvement here, but it covers the essentials.

### Animations & Interactions

The app includes subtle animations powered by [Framer Motion](https://motion.dev/):
- Flashcard flip transitions
- Page transitions
- Button hover effects
- Loading states for AI generation
- Success animations for subscription actions

Users can disable animations in their preferences if they prefer a more static experience.

### Theme Management

Supports light and dark themes, with system preference detection. Theme preference is stored in user settings and synced across devices. The subscription UI works well in both themes.

## Performance & Optimization

### Bundle Optimization

[Next.js](https://nextjs.org/) handles most of the optimization automatically:
- Automatic code splitting
- Image optimization
- Static generation where possible
- Tree shaking for AI libraries

The AI integration added some bundle size, but it's loaded lazily to avoid impacting initial page load.

### Database Queries

I've optimized the most common queries:
- Proper indexing on frequently queried fields
- Batching related data fetches
- Subscription status caching to avoid repeated lookups

There are still some areas where I could optimize further, particularly in the statistics calculations.

### API Performance

- AI generation is handled asynchronously with proper timeout handling
- Stripe webhooks are processed efficiently with error recovery
- Rate limiting prevents resource abuse

### Core Web Vitals

The app generally scores well on Core Web Vitals, though there's always room for improvement. The main performance bottleneck is usually the statistics dashboard when you have a lot of review history.

AI generation can take 5-15 seconds depending on the content size, but there's proper loading states and progress indication.

## Known Issues & Limitations

### Current Bugs

There are still some edge cases I haven't fully resolved:
- Statistics calculations can be inconsistent in certain scenarios
- Study session auto-save doesn't work perfectly in all browser configurations
- PDF processing occasionally fails on complex documents with unusual formatting
- Subscription status sometimes takes a moment to update after payment changes

### Performance Bottlenecks

- Statistics dashboard gets slow with large amounts of review history
- AI flashcard generation can be slow for large documents (but there's not much I can do about that)
- Mobile performance could be better, especially during AI generation

### Feature Limitations

- AI generation is English-only currently
- Limited file format support for AI generation (only PDFs currently)
- No collaborative features (sharing decks, etc.)
- Basic export functionality (JSON only)
- Subscription management could be more sophisticated

### Technical Debt

The biggest issue is leftover technical debt from the initial proof of concept:
- Some database logic still exists directly in components
- Inconsistent type definitions in some areas
- Missing error handling in edge cases
- AI error handling could be more robust

I'm slowly working through these issues, but it's the kind of thing you notice every time you touch anything statistics-related. The subscription features forced me to clean up some of this, but there's still work to do.

## Future Roadmap

### Planned Features

**Short Term:**
- Multi-language AI generation
- More file format support (DOCX, TXT, etc.)
- Improved mobile experience
- Better error handling throughout

**Medium Term:**
- Collaborative deck sharing
- Advanced analytics for Pro users
- Better export/import options
- Mobile apps (maybe)

**Long Term:**
- Advanced SRS algorithms beyond SuperMemo-2
- AI-powered learning recommendations
- Community features and marketplace
- Enterprise features for schools

### Technical Improvements

- Clean up remaining technical debt
- Add comprehensive unit and integration tests
- Better monitoring and error tracking
- Performance optimizations
- More sophisticated subscription management

### Business Development

- Referral program
- Team/family plans
- API access for developers
- Educational institution partnerships

### Scalability Considerations

The current architecture should handle several thousand users, but there are areas that would need attention for serious scale:

- Database optimization for large datasets
- Caching strategy improvements
- Background job processing for AI features
- CDN setup for assets
- AI cost optimization and batching

The subscription system is built to scale, but payment recovery and customer support processes would need more automation.

## Contributing

### Development Setup

To run the app locally:

```bash
# Clone the repository
git clone https://github.com/Fx64b/learn.git
cd learn

# Install dependencies
pnpm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in your environment variables (you'll need Stripe, Google AI, etc.)

# Run database migrations
pnpm db:migrate

# Start the development server
pnpm dev
```

### Code Contribution Guidelines

If you want to contribute (and help me clean up the technical debt), here are some guidelines:

- Use TypeScript with proper types
- Follow the existing code style
- Add tests for new features
- Update documentation for significant changes
- Be careful with subscription logic - test thoroughly
- AI features should include proper error handling and rate limiting

### Issue Reporting

If you find bugs or have feature requests, please open an issue on GitHub. Include as much detail as possible - it makes fixing things much easier. For subscription-related issues, please include your subscription status (but not payment details).

### Feature Requests

I'm open to feature requests, though keep in mind this is primarily a personal project that happened to grow into a business. Features that align with the goal of "create a flashcard app that doesn't suck" are most likely to be implemented.

AI and subscription features get priority since they're revenue-generating, but I'm always interested in improving the core learning experience.

## License

This project is open source under the MIT License. Feel free to use it, modify it, or learn from it. If you do use it for something cool, I'd love to hear about it.

Note that while the code is open source, you'll need your own API keys for Google AI, Stripe, etc. to run the full feature set.

## Activity

![Alt](https://repobeats.axiom.co/api/embed/e26f5c728d5b30144b3d3353306a519469a999f0.svg 'Repobeats analytics image')

---

*This documentation reflects the current state of what started as a simple study tool and somehow became a full SaaS application. The journey from "quick flashcard app" to "AI-powered learning platform with subscriptions" has been both educational and slightly overwhelming, but that's what makes side projects fun.*
