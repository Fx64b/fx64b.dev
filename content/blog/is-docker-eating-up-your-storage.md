---
title: 'Is Docker Eating Up Your Storage?'
date: '2025-07-16'
description: 'Docker can consume a lot of disk space over time. This guide helps you reclaim that space.'
read: '5 mins'
author: 'Fx64b'
---

# Is Docker Eating Up Your Storage?

<br/>

So there I was, working on my [video-archiver](/projects/video-archiver) project on my Manjaro Linux laptop, when suddenly my system started throwing "disk space full" errors.

_Weird._ I've got 1TB of storage, and I definitely haven't downloaded that many Linux ISOs... right?

A quick `df -h` revealed the brutal truth: **2GB free out of 1TB**, with only 85GB showing as "used" in my file manager. Something was definitely off.

## The Storage Mystery

My first thought was partition issues. I run a dual-boot setup, so maybe something went wrong with the disk layout? After a few hours of running diagnostic commands and diving into partition tables, I found... nothing unusual.

That's when it hit me: I'd been working with Docker quite a bit lately. _Could it be...?_

Turns out, it absolutely was. Docker had accumulated a whopping **~250GB** of build cache.

## How I Ended Up Here

The problem was my video-archiver project. In my enthusiasm to add Docker support, I implemented what I can only describe as "quick and dirty" containerization:

- Unoptimized Docker images
- No `.dockerignore` file
- `node_modules` being copied into images (and cached)
- Downloaded videos and SQLite databases in the same directory getting copied into images
- Multiple rebuilds creating layers upon layers of cached data

Basically, I did everything you're not supposed to do with Docker, and my disk space paid the price.

## Diagnosing Docker Storage Issues

If you suspect Docker is eating your storage, here's how to investigate:

### Check Overall Docker Disk Usage

```bash
docker system df
```

This shows you a breakdown of space used by:

- Images
- Containers
- Build cache
- Volumes

### Detailed Build Cache Analysis

```bash
docker buildx du
```

This command shows detailed information about your build cache, including which cache entries are taking up the most space.

### Monitor Images

```bash
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10
```

Lists your largest images so you can see what's consuming space.

### The Diagnostic Script

I created this handy script to check Docker storage usage:

```bash
#!/bin/bash
echo "🐳 Docker Resource Monitor"
echo "=========================="
echo "💾 System Usage:"
docker system df
echo ""
echo "🏗️ Build Cache:"
docker buildx du 2>/dev/null || echo "BuildKit not available"
echo ""
echo "📊 Image Stats:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10
```

## Manual Cleanup Solutions

Once you've confirmed Docker is the problem, here's how to fix it:

### The Nuclear Option

```bash
docker system prune -a --volumes
```

**Warning**: This removes everything - unused images, containers, networks, volumes, and build cache. Only use this if you're okay with rebuilding everything.

### Surgical Cleanup

I prefer a more controlled approach:

```bash
#!/bin/bash
echo "🧹 Starting Docker cleanup..."
echo "📊 Current Docker disk usage:"
docker system df

echo "🗑️ Removing dangling images..."
docker image prune -f

echo "🧽 Cleaning build cache..."
docker builder prune -f

echo "📦 Removing unused containers..."
docker container prune -f

echo "✅ Cleanup complete!"
echo "📊 New Docker disk usage:"
docker system df
```

### Selective Build Cache Cleanup

For a less aggressive approach, you can remove build cache older than a certain time:

```bash
docker builder prune -f --filter 'until=48h'
```

This removes build cache older than 48 hours, which is what I added to my run script as a quick fix.

## Automated Solutions

### Cron Job for Regular Cleanup

Add this to your crontab to run cleanup weekly:

```bash
# Clean Docker build cache weekly
0 2 * * 0 docker builder prune -f --filter 'until=72h'
```

### Docker Compose with Cleanup

For development environments, you could include cleanup in the workflow:

```yaml
version: '3.8'
services:
    app:
        build: .
        # ... other config

    # Cleanup service
    cleanup:
        image: alpine
        command: sh -c "docker builder prune -f --filter 'until=24h'"
        profiles:
            - cleanup
```

Run cleanup with: `docker-compose --profile cleanup up cleanup`

## Prevention is Better Than Cure

Here's how to avoid this mess in the first place:

### 1. Use .dockerignore

Create a `.dockerignore` file to exclude unnecessary files:

```dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.parcel-cache
dist
*.db
*.sqlite
downloads/
```

### 2. Multi-stage Builds

Use multi-stage builds to reduce final image size:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### 3. Configure Docker Daemon

Set build cache limits in Docker daemon configuration:

```json
{
    "builder": {
        "gc": {
            "enabled": true,
            "defaultKeepStorage": "20GB",
            "policy": [
                {
                    "keepStorage": "10GB",
                    "filter": [
                        "type==source.local",
                        "type==exec.cachemount",
                        "type==source.git.checkout"
                    ]
                }
            ]
        }
    }
}
```

### 4. Monitor Regularly

Set up monitoring to catch storage issues early:

```bash
# Add to your shell profile (e.g., ~/.bashrc or ~/.zshrc)
alias docker-usage="docker system df && echo '' && docker buildx du 2>/dev/null || echo 'BuildKit not available'"
```

## Lessons Learned

1. **Docker's build cache is powerful but can be storage-hungry**
2. **Always use `.dockerignore` in projects**
3. **Regular cleanup prevents emergency situations**
4. **Multi-stage builds are your friend**
5. **Monitor your Docker usage**

The 250GB build cache was definitely a learning experience. Now I'm more careful about what gets copied into my Docker images, and I have automated cleanup processes in place.

## Quick Reference

**Diagnostic Commands:**

- `docker system df` - Overall usage
- `docker buildx du` - Build cache details
- `docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"` - Image sizes

**Cleanup Commands:**

- `docker system prune -a --volumes` - Nuclear option
- `docker builder prune -f` - Clean build cache
- `docker image prune -f` - Remove dangling images
- `docker container prune -f` - Remove stopped containers

**Prevention:**

- Use `.dockerignore`
- Implement multi-stage builds
- Set up automated cleanup
- Monitor regularly

_P.S. - Yes, I probably should have noticed the 250GB of missing space sooner. In my defense, I was very focused on getting the video-archiver features working. Sometimes you get so deep into building something that you forget to check if you're accidentally filling up your hard drive in the process._
