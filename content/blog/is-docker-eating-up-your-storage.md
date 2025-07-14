---
title: 'Is Docker Eating Up Your Storage?'
date: '2025-07-11'
description: 'Docker can consume a lot of disk space over time. This guide helps you reclaim that space.'
read: '8 mins'
author: 'Fx64b'
---

_This is obviously an ai generated article that I used as a placeholder. If it manages to get into production or my git history, I will be very disappointed in myself. I will write a proper article later._

# Is Docker Eating Up Your Storage?

## The Great Docker Storage Mystery 🐳💾

Picture this: You're coding away, feeling like a containerization wizard, when suddenly your computer starts moving slower than a Windows 95 machine trying to run Crysis. You check your disk space and... _panic mode activated_. Your 500GB SSD is mysteriously down to 2GB free space. "But I only have a few Node.js projects!" you cry into the void.

Plot twist: Docker has been silently nomming on your storage like Cookie Monster at a bakery convention.

## The Silent Storage Assassin

Docker build cache is like that friend who crashes at your place for "just a few days" and ends up living there for six months. It starts innocently enough – Docker caches build layers to make subsequent builds faster (which is actually pretty neat). But here's the kicker: **Docker never automatically cleans up these cached layers**.

According to the [Docker documentation](https://docs.docker.com/build/cache/), the build cache can grow quite large over time, especially if you're building images frequently or working with large base images. Each `RUN`, `COPY`, `ADD`, and other instructions in your Dockerfile creates a new layer, and Docker lovingly keeps them all "just in case."

It's like digital hoarding, but with more YAML files.

## The Usual Suspects 🕵️

### 1. **Build Cache Layers**

Every time you run `docker build`, Docker creates intermediate layers. Even if your build fails halfway through, those layers stick around like uninvited party guests.

### 2. **Dangling Images**

These are images with no tags – basically Docker's equivalent of mystery leftovers in your fridge. You know they exist, but you're not sure what they are or if you need them.

### 3. **Unused Images**

Images you built once for that weekend hackathon project and never touched again. They're taking up space like that exercise equipment you bought with good intentions.

### 4. **Build Kit Cache**

Docker's BuildKit (the modern build engine) has its own cache storage that can grow substantially, especially when using multi-stage builds or BuildKit features like cache mounts.

## Detecting the Storage Invasion 🔍

### Check Your Docker Disk Usage

First, let's see how much space Docker is actually using:

```bash
docker system df
```

This command shows you a breakdown of Docker's storage usage. If you see numbers that make your wallet cry, you've found the culprit.

For more detailed information:

```bash
docker system df -v
```

This verbose output will show you exactly which images, containers, and volumes are hogging your precious gigabytes.

### The BuildKit Cache Check

To check BuildKit cache specifically:

```bash
docker buildx du
```

If this command returns sizes measured in gigabytes rather than megabytes, your build cache has been hitting the storage buffet a little too hard.

## The Great Cleanup Operation 🧹

### 1. **The Nuclear Option**

```bash
docker system prune -a --volumes
```

This command is like Marie Kondo for your Docker installation – it removes everything that doesn't "spark joy" (i.e., isn't currently being used). **Warning**: This will remove ALL unused images, not just dangling ones.

### 2. **The Surgical Approach**

**Remove build cache only:**

```bash
docker builder prune
```

**Remove dangling images:**

```bash
docker image prune
```

**Remove unused images (be careful!):**

```bash
docker image prune -a
```

**Remove unused containers:**

```bash
docker container prune
```

### 3. **The BuildKit Cache Cleanup**

```bash
docker buildx prune
```

For more aggressive cleanup:

```bash
docker buildx prune --all
```

## Prevention: Because Prevention > Cure 🛡️

### 1. **Use .dockerignore Files**

Create a `.dockerignore` file to prevent unnecessary files from being included in your build context:

```dockerignore
node_modules
.git
.DS_Store
*.log
coverage/
.nyc_output
```

### 2. **Multi-stage Builds**

Use multi-stage builds to keep your final images lean:

```dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. **Regular Cleanup Schedule**

Set up a cron job or use your system's task scheduler to run cleanup commands regularly:

```bash
0 2 * * 0 docker system prune -f
```

_Add to crontab `(crontab -e)`_

### 4. **Configure Build Cache Limits**

You can limit BuildKit cache size by configuring the daemon:

```json
{
    "builder": {
        "gc": {
            "defaultKeepStorage": "20GB"
        }
    }
}
```

## Automation: Set It and Forget It 🤖

### 1. **Shell Script for Regular Maintenance**

Create a script called `docker-cleanup.sh`:

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

Make it executable:

```bash
chmod +x docker-cleanup.sh
```

### 2. **GitHub Actions Workflow**

If you're using GitHub Actions, add this to clean up after builds:

```yaml
- name: Clean up Docker
  run: |
      docker system prune -f
      docker builder prune -f
```

### 3. **Docker Compose Hook**

Add cleanup to your docker-compose workflow:

```yaml
version: '3.8'
services:
    app:
        # ... your service config

    cleanup:
        image: docker:dind
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
        command: sh -c "docker system prune -f"
        profiles: ['cleanup']
```

Run cleanup with:

```bash
docker-compose --profile cleanup up cleanup
```

## Monitoring: Keep an Eye on the Cookie Monster 👀

### 1. **Disk Usage Alerts**

Create a simple monitoring script:

```bash
#!/bin/bash

THRESHOLD=80
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $USAGE -gt $THRESHOLD ]; then
    echo "⚠️ Disk usage is at ${USAGE}%"
    echo "🐳 Docker usage:"
    docker system df
    echo "Consider running: docker system prune"
fi
```

### 2. **Docker Stats Dashboard**

Use tools like Portainer or create a simple script to monitor Docker resource usage:

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

## The Happy Ending 🎉

Docker build cache is like that overly helpful friend who saves everything "just in case" – well-intentioned but potentially problematic if left unchecked. With regular maintenance, proper configuration, and a bit of automation, you can keep Docker from turning your storage device into digital Swiss cheese.

Remember: A clean Docker environment is a happy Docker environment. Your SSD will thank you, your build times will stay snappy, and you'll avoid the dreaded "No space left on device" error that has haunted developers since the dawn of computing.

Now go forth and containerize responsibly! 🐳✨

---

_P.S. If you found 50GB of Docker cache on your machine after reading this article, you're not alone. We've all been there. The important thing is that we're cleaning up now, together._ 🤝

## Conclusion

# heading

## heading

### Summary

# heading

## Conclusion

# heading

## heading

### Summary

# heading

## Conclusion

# heading

## heading

### Summary

# heading## Conclusion

# heading

## heading

### Summary

# heading

## Conclusion

# heading

## heading

### Summary

# heading

## Conclusion

# heading

## heading

### Summary

# heading

## Conclusion

# heading

## heading

### Summary

# heading

## Conclusion

# heading

## heading

### Summary

# heading
