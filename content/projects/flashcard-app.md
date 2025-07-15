---
title: 'Flashcard App - Technical Documentation'
description: 'Comprehensive technical documentation for the modern flashcard application with SRS (Spaced Repetition System) implementation.'
lastUpdated: '2025-01-15'
author: 'Fx64b'
status: 'published'
projectSlug: 'flashcard-app'
version: '1.10.1'
readTime: '12 mins'
---

# Flashcard App - Technical Documentation

## Overview

The Flashcard App is a modern web application designed for effective learning using the Spaced Repetition System (SRS). Built with Next.js 15, TypeScript, and Turso database, it provides users with a powerful platform for creating, managing, and studying flashcards.

What started as a quick project for my final general education exam turned into something much more ambitious. The app implements a proper SRS algorithm (borrowed heavily from Anki's approach), supports multiple languages, includes AI-powered flashcard generation, and even has a subscription system. 

Honestly, it's probably over-engineered for what I initially needed, but where's the fun in building something simple?

## Project History & Vision

### The Idea

The whole thing started because I needed to study for my final exams and wasn't particularly happy with the existing flashcard apps out there. Anki is powerful but feels ancient, and most modern alternatives either cost too much or lack the sophisticated spaced repetition that actually makes flashcards effective.

So naturally, instead of just using what was available, I decided to build my own. Because nothing says "I should be studying" like spending weeks building a study app instead of actually studying.

### Development Journey

Initially, this was meant to be a quick proof of concept - just enough to get through my exams. But as often happens with side projects, it grew legs and started walking on its own.

The first version was pretty rough. I had database logic scattered throughout components, inconsistent statistics calculations, and way too many `console.log` statements that I forgot to remove. Classic move.

Over time, I've been slowly refactoring the technical debt from that initial rush job. It's still not perfect (more on that later), but it's getting there.

### Current State

As of version 1.10.1, the app includes:

- Proper SRS implementation with SuperMemo-2 algorithm
- Multi-language support (English and German)
- AI-powered flashcard generation
- Subscription management with Stripe
- Progress tracking and analytics
- Export/import functionality

It's deployed on Vercel and actually works pretty well. I use it regularly, which I guess is the ultimate test for any personal project.

### Future Vision

The goal is to create a flashcard app that doesn't suck. Something that combines the sophistication of Anki with a modern, intuitive interface. I want it to be powerful enough for serious learners but simple enough that you don't need a PhD to figure out how to add a flashcard.

## Architecture Overview

### High-Level Architecture

This is a pretty standard Next.js application with server-side rendering and server actions. I chose to keep everything in a single codebase rather than splitting into separate frontend and backend services, mainly because hosting is so much easier when you only have one thing to deploy.

The architecture looks something like this:

```txt
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Server Actions │    │   Database      │
│   (React/Next)  │◄──►│   (Next.js API)  │◄──►│   (Turso)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
   │
   ▼
┌──────────────────┐
│  External APIs   │
│  (Stripe, AI)    │
└──────────────────┘
```

### Component Structure

I tried to follow a pretty standard React pattern:

- **Pages** handle routing and data fetching
- **Components** are reusable UI pieces
- **Server Actions** handle all the business logic
- **Utils** contain shared functionality

There's still some technical debt where I have database logic directly in components from the initial proof of concept, but I'm slowly cleaning that up.

### Data Flow

Data flows through server actions, which is honestly one of my favorite things about Next.js 15. No need to set up API routes for everything - you can just call server functions directly from your components.

The pattern looks like this:

1. User interacts with UI
2. Component calls server action
3. Server action handles business logic and database operations
4. UI updates with new data

### State Management

I keep client-side state pretty minimal. Most data lives in the database and gets fetched fresh when needed. For the few things that need client-side state (like user preferences and animations), I use Zustand with localStorage persistence.

## Core Features

### Deck Management

Users can create and organize flashcards into decks. Each deck has:

- Title and description
- Category for organization
- Optional due date for exam preparation
- Progress tracking

The deck creation process is straightforward - you fill out a form, and it creates a new deck. Nothing fancy, but it works.

### Flashcard Creation & Editing

There are three ways to create flashcards:

1. **Single card creation** - The traditional one-at-a-time approach
2. **Bulk JSON import** - For when you have a lot of cards to add
3. **AI generation** - Let the AI create cards based on your prompts or uploaded PDFs

The bulk import was added because manually creating dozens of cards gets tedious fast. You just paste in a JSON array with your cards, and it processes them all at once.

### Learning System

This is where the magic happens. The app uses a spaced repetition algorithm based on SuperMemo-2 (the same one Anki uses). When you review a card, you rate it from 1-4:

- **1 (Again)** - You got it wrong, see it again soon
- **2 (Hard)** - You got it right but struggled
- **3 (Good)** - You got it right with normal effort
- **4 (Easy)** - You knew it immediately

The algorithm then calculates when you should see that card next, spacing out reviews over increasingly longer intervals.

### Progress Tracking

The app tracks various statistics:

- Daily review counts
- Success rates
- Learning streaks
- Time-of-day analysis
- Cards by difficulty level

I'll be honest - the statistics code was a nightmare for a while. I had inconsistent filtering logic scattered everywhere, which led to weird edge cases where the numbers didn't add up. It's mostly fixed now, but this is definitely an area where the initial proof-of-concept approach bit me.

### Study Sessions

Study sessions track your learning activity, including:

- Start and end times
- Number of cards reviewed
- Whether the session was completed

There's some auto-save functionality to handle cases where you close the browser mid-session, though I'm not 100% confident it works perfectly in all edge cases.

## Technical Stack

### Frontend

- **Next.js 15** - The main framework. I really like how development feels with Next.js, even if it's probably overkill for some projects.
- **TypeScript** - Because life's too short for runtime type errors (though I still have some untyped areas that need cleanup)
- **Tailwind CSS** - For styling. Combined with some custom CSS for animations.
- **Framer Motion** - For the flashcard flip animations and transitions
- **shadcn/ui** - Component library for consistent UI elements

### Backend

- **Next.js Server Actions** - Instead of building a separate API
- **Drizzle ORM** - I heard good things about it and wanted to try it out. Turned out to be a solid choice, even if it caused a few hours of debugging frustration initially.
- **NextAuth.js** - For authentication via magic email links

### Database

- **Turso (libSQL)** - SQLite-compatible database that scales
- **Drizzle migrations** - For schema management

I chose Turso because it's basically SQLite but hosted, which gives you the simplicity of SQLite with the convenience of not having to manage your own database server.

### External Services

- **Resend** - For sending authentication emails
- **Stripe** - Payment processing for Pro subscriptions
- **Google Generative AI** - For AI-powered flashcard generation
- **Vercel** - Hosting and deployment

## Features in Implementation

### AI Integration (Work in Progress)

The AI features are functional but still being refined:

**Current State:**

- Can generate flashcards from text prompts
- Supports PDF upload and processing
- Uses Google's Gemini model for generation
- Rate limited to prevent abuse

**What's Being Worked On:**

- Better prompt engineering for higher quality cards
- Support for more file types
- Improved error handling
- Cost optimization

The AI implementation was 100% generated by AI initially (ironic, I know), but it actually did a pretty good job. I've been slowly understanding and improving the code as I go.

### Payment Integration (Work in Progress)

Stripe integration is implemented for Pro subscriptions:

**Current State:**

- Monthly and yearly subscription options
- Webhook handling for subscription events
- Billing portal integration
- Pro feature gating

**What Needs Work:**

- Better error handling for failed payments
- More subscription plan options
- Usage-based billing for AI features
- Cancellation flow improvements

The payment stuff works, but there are definitely edge cases I haven't fully tested. It's one of those areas where you don't really know how robust your implementation is until real money starts flowing through it.

## Database Schema

### Core Tables

The database schema is pretty straightforward:

**Users & Auth** (handled by NextAuth):

- `users` - Basic user information
- `accounts`, `sessions`, `verificationTokens` - Auth-related tables

**Learning Content**:

- `decks` - Collections of flashcards
- `flashcards` - Individual cards with front/back content
- `card_reviews` - Current state of each card's review schedule
- `review_events` - Historical record of all reviews

**Analytics**:

- `study_sessions` - Tracking learning sessions
- `user_preferences` - UI preferences and settings

**Business**:

- `subscriptions` - Stripe subscription data

### Relationships

The relationships are pretty standard:

- Users have many decks
- Decks have many flashcards
- Flashcards have many review events
- Users have review history for cards

### Indexes & Performance

I've added indexes on the most commonly queried fields:

- User ID (for obvious reasons)
- Next review dates (for finding due cards)
- Deck associations
- Review timestamps

Performance is generally good, though I haven't done serious load testing. SQLite is pretty fast for this kind of workload.

### Migration Strategy

Database migrations are handled by Drizzle. When you want to add a field to a table, you extend the schema in code and generate new SQL migration files. Then you run the migration to safely apply changes to the actual database.

It's a clean approach, though I did spend some frustrated hours debugging migration issues early on when I didn't fully understand how Drizzle worked.

## Authentication & Security

### NextAuth.js Implementation

Authentication uses NextAuth.js with email-only login (no passwords). Users get a magic link sent to their email, click it, and they're logged in. It's simple and secure - no passwords to forget or leak.

### Session Management

Sessions are JWT-based and handled entirely by NextAuth. The session includes the user ID, which is all we really need for most operations.

### Rate Limiting

I've implemented rate limiting using Upstash Redis to prevent abuse:

- Email sending (5 emails per 15 minutes)
- Bulk operations (10 per hour)
- General API usage (100 per hour)

The rate limiting saved me when I accidentally created an infinite loop during development that was sending hundreds of emails.

### Security Headers

The app includes standard security headers:

- CSP (Content Security Policy)
- X-Frame-Options
- X-XSS-Protection
- HSTS (HTTP Strict Transport Security)

These are configured in the middleware and help protect against common web vulnerabilities.

### Data Protection

User data is isolated by user ID in all database queries. Server actions verify the user's session before performing any operations. It's not bulletproof, but it covers the basics.

## Spaced Repetition System (SRS)

### Algorithm Implementation

I borrowed heavily from Anki's approach here, which uses a modified SuperMemo-2 algorithm. I'm not skilled enough yet to implement SRS algorithms cleanly from scratch, so I had AI generate most of this initially (and it did a surprisingly good job).

### How It Works

When you review a card, the algorithm calculates:

1. **Ease Factor** - How "easy" the card is (starts at 2.5)
2. **Interval** - Days until next review
3. **Next Review Date** - When you'll see it again

The ease factor adjusts based on your rating:

- Rating 1 (Again): Decreases ease, resets interval
- Rating 2 (Hard): Slightly decreases ease, modest interval increase
- Rating 3 (Good): Maintains ease, normal interval calculation
- Rating 4 (Easy): Increases ease, longer interval

### Review Scheduling

New cards start with a 1-day interval. As you successfully review them, the intervals get longer: 1 day → 3 days → 8 days → 20 days → 48 days, etc.

The exact intervals depend on the ease factor and your performance on that specific card.

### Performance Metrics

The system tracks various metrics to help users understand their progress:

- Cards due for review
- Success rates by difficulty
- Learning streaks
- Time spent studying

Some of these calculations were buggy for a while due to inconsistent filtering logic, but they're mostly cleaned up now.

## Internationalization

### Next-intl Setup

The app supports English and German using next-intl. The setup is pretty standard - you have message files for each language, and the library handles the rest.

### Language Support

Currently supports:

- **English** - Primary language
- **German** - Secondary language

Adding more languages is just a matter of creating new translation files and updating the language selector.

### Locale Management

User language preferences are stored in the database for authenticated users, and in cookies for guests. The locale is determined in this order:

1. User's saved preference (if logged in)
2. Cookie value
3. Default to English

### Translation Workflow

Translations are stored in JSON files under `/messages/`. When I need to add new text, I add it to the English file and then create the German translation.

It's a manual process right now, which doesn't scale great, but it works for the current size of the app.

## User Experience & Interface

### Design System

The UI uses a consistent design system built on top of shadcn/ui components and Tailwind CSS. I went for a clean, modern look that doesn't get in the way of learning.

The design philosophy is "functional first, pretty second." It needs to work well before it needs to look amazing.

### Responsive Design

The app works on mobile, tablet, and desktop. The flashcard interface is optimized for touch interactions on mobile devices.

I spent way too much time getting the card flip animations to work properly on different screen sizes, but it was worth it for the satisfying interaction.

### Accessibility

Basic accessibility features are implemented:

- Keyboard navigation for flashcard reviews
- Proper ARIA labels
- Color contrast compliance
- Screen reader support

There's definitely room for improvement here, but it covers the essentials.

### Animations & Interactions

The app includes subtle animations powered by Framer Motion:

- Flashcard flip transitions
- Page transitions
- Button hover effects
- Loading states

Users can disable animations in their preferences if they prefer a more static experience.

### Theme Management

Supports light and dark themes, with system preference detection. Theme preference is stored in user settings and synced across devices.

## Performance & Optimization

### Bundle Optimization

Next.js handles most of the optimization automatically:

- Automatic code splitting
- Image optimization
- Static generation where possible
- Tree shaking for unused code

### Database Queries

I've optimized the most common queries:

- Proper indexing on frequently queried fields
- Batching related data fetches
- Avoiding N+1 query problems

There are still some areas where I could optimize further, particularly in the statistics calculations.

### Caching Strategy

Next.js handles most caching automatically. For expensive operations like statistics calculations, I use React's cache function to avoid repeated computations within a single request.

### Core Web Vitals

The app generally scores well on Core Web Vitals, though there's always room for improvement. The main performance bottleneck is usually the statistics dashboard when you have a lot of review history.

## Known Issues & Limitations

### Current Bugs

There are still some edge cases I haven't fully resolved:

- Statistics calculations can be inconsistent in certain scenarios
- Study session auto-save doesn't work perfectly in all browser configurations
- PDF processing occasionally fails on complex documents

### Performance Bottlenecks

- Statistics dashboard gets slow with large amounts of review history
- AI flashcard generation can be slow for large documents
- Mobile performance could be better on older devices

### Feature Limitations

- Limited file format support for AI generation (only PDFs currently)
- No collaborative features (sharing decks, etc.)
- Basic export functionality (JSON only)

### Technical Debt

The biggest issue is leftover technical debt from the initial proof of concept:

- Some database logic still exists directly in components
- Inconsistent type definitions in some areas
- Missing error handling in edge cases

I'm slowly working through these issues, but it's the kind of thing you notice every time you touch anything statistics-related.

## Future Roadmap

### Planned Features

**Short Term:**

- Better AI prompt engineering
- More file format support
- Improved mobile experience
- Better error handling

**Medium Term:**

- Collaborative deck sharing
- Advanced analytics
- Integration with external learning platforms
- Better export/import options

**Long Term:**

- Mobile apps (maybe)
- Advanced SRS algorithms
- AI-powered learning recommendations
- Community features

### Technical Improvements

- Clean up remaining technical debt
- Improve test coverage
- Better monitoring and error tracking
- Performance optimizations

### Scalability Considerations

The current architecture should handle a reasonable number of users, but there are areas that would need attention for serious scale:

- Database optimization for large datasets
- Caching strategy improvements
- Background job processing for AI features
- CDN setup for assets

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
# Fill in your environment variables

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

### Issue Reporting

If you find bugs or have feature requests, please open an issue on GitHub. Include as much detail as possible - it makes fixing things much easier.

### Feature Requests

I’m open to feature requests, though keep in mind this is primarily a personal project. Features that align with the goal of “create a flashcard app that doesn’t suck” are most likely to be implemented.

## License

This project is open source under the MIT License. Feel free to use it, modify it, or learn from it. If you do use it for something cool, I’d love to hear about it.

## Activity

![Alt](https://repobeats.axiom.co/api/embed/e26f5c728d5b30144b3d3353306a519469a999f0.svg 'Repobeats analytics image')
