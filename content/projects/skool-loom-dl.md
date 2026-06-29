---
title: 'Skool Downloader - Technical Documentation'
description: 'A Go utility to automatically scrape and download Loom and YouTube videos from Skool.com classrooms.'
lastUpdated: '2025-12-30'
author: 'Fx64b'
status: 'published'
projectSlug: 'skool-loom-dl'
version: '2.0.0 (2025/12/30)'
readTime: '6 mins'
---

# Skool Downloader

<div className="my-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/[0.04] to-background">
  <div className="p-8 text-center sm:p-10">
    <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Download Skool videos in one click</h2>
    <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-lg">No installs. No command line. A hosted tool that adds a download button to every Skool video — and lets you grab entire courses at once. Join the waitlist to get early access.</p>
    <a href="https://skool.fx64b.dev" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3 font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90" target="_blank" rel="noopener noreferrer">
      Join the Waitlist
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>
    <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-lg border border-primary/15 bg-background/60 p-4 text-left text-sm">
      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.7L6.4 21l1.6-7-5.4-4.7 7.1-.6z"/></svg>
      <span><strong className="text-foreground">Early bird bonus:</strong> join now and get 1 month of Pro free at launch — 50 downloads per day, 30-day video retention, and bulk ZIP exports.</span>
    </div>
  </div>
</div>

<div className="grid grid-cols-1 gap-4 my-8 md:grid-cols-3">
  <div className="rounded-xl border border-primary/10 bg-primary/5 p-5">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/20">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
    </div>
    <h4 className="mb-1 font-semibold">One-click downloads</h4>
    <p className="mb-0 text-sm text-muted-foreground">A simple browser extension adds a download button to every Skool video.</p>
  </div>
  <div className="rounded-xl border border-primary/10 bg-primary/5 p-5">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/20">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    </div>
    <h4 className="mb-1 font-semibold">Bulk downloads</h4>
    <p className="mb-0 text-sm text-muted-foreground">Grab entire modules or courses at once with Pro. Save hours of clicking.</p>
  </div>
  <div className="rounded-xl border border-primary/10 bg-primary/5 p-5">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/20">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    </div>
    <h4 className="mb-1 font-semibold">Progress tracking</h4>
    <p className="mb-0 text-sm text-muted-foreground">A dashboard to track every download, manage storage, and pick up where you left off.</p>
  </div>
</div>

<hr className="my-10 border-border/40" />

<div className="my-8 rounded-xl border border-border/60 bg-secondary/30 p-6">
  <h3 className="mb-1 mt-0 text-lg font-semibold">Available now: the free, open-source CLI</h3>
  <p className="mb-0 text-sm text-muted-foreground">Don't want to wait for the hosted version? The command-line tool documented below is free, open source, and ready to use today — everything that follows is its full technical documentation.</p>
</div>

## Overview

The Skool Downloader is a Go-based CLI utility that I wrote over the weekend. I was about to leave a Skool community and wanted to download my favorite courses before leaving.
I couldn't figure out a simple way to download them manually, so I decided to vibe code this tool to automate the process.
In simple terms, it scrapes a Skool classroom page, based on the provided URL, and downloads all Loom and YouTube videos from that page.

## Disclaimer

<div className="border-l-4 mt-4 border-destructive bg-destructive/10 p-4 rounded-md">
  <div className="flex space-x-3">
    <div className="mt-1">
      <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-2">
      <span className="text-md font-medium text-destructive">Warning</span>
      <div className="mt-2 text-sm text-destructive/80">
        This tool is provided for educational and legitimate purposes only.
      </div>
    </div>
  </div>
</div>
<br/>
Use this tool only to download content you have the right to access. Please respect copyright laws and terms of service:
<br/><br/>
<ul>
    <li>Only download videos you have permission to save</li>
    <li>Do not bypass paywalls or access unauthorized content</li>
    <li>Respect the terms of service of both Skool.com and Loom.com</li>
    <li>The developers accept no liability for misuse</li>
</ul>

## What's New in v2.0.0

Version 2.0.0 represents a major upgrade with several important changes:

- **YouTube Support**: Now downloads both Loom and YouTube videos from Skool classrooms
- **Project Renamed**: Changed from `skool-loom-dl` to `skool-downloader` to reflect broader video support
- **Pre-built Binaries**: Official releases now include binaries for all major platforms
- **Improved Video Extraction**: Enhanced JSON parsing with fallback regex extraction
- **URL Normalization**: Automatically converts embed URLs to standard formats
- **Better Testing**: Comprehensive unit tests and Docker integration tests
- **CI/CD Pipeline**: Automated testing and release workflows
- **Docker Support**: Official Docker image with all dependencies included
- **Better Documentation**: Improved README and technical documentation
- **Critical Bugfix**: A critical bug was fixed which caused the tool to only download a few or incorrect videos instead of the entire classroom.

## Features

- Scrapes Loom and YouTube video links from [Skool.com](https://skool.com) classroom pages
- Authentication via email/password or cookies
- Supports JSON and Netscape cookies.txt formats
- Downloads videos using yt-dlp with proper authentication
- Automatically detects and normalizes video URLs
- Configurable page loading wait time
- Toggleable headless mode for debugging
- Pre-built binaries for all major platforms (Linux, Windows, macOS)
- Comprehensive test suite with Docker integration tests
- Docker support for containerized deployment

## Installation

### Option 1: Download Pre-built Binaries (Recommended)

1. Install [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)
2. Download the latest release from the [Releases page](https://github.com/fx64b/skool-downloader/releases)
3. Choose the appropriate binary for your platform:
    - **Linux (x64)**: `skool-downloader-linux-amd64`
    - **Linux (ARM64)**: `skool-downloader-linux-arm64`
    - **Windows (x64)**: `skool-downloader-windows-amd64.exe`
    - **Windows (ARM64)**: `skool-downloader-windows-arm64.exe`
    - **macOS (Intel)**: `skool-downloader-darwin-amd64`
    - **macOS (Apple Silicon)**: `skool-downloader-darwin-arm64`
4. Make it executable (Linux/macOS): `chmod +x skool-downloader-*`

> **Note:** Older versions were called `skool-loom-dl` before release v2.0.0

### Option 2: Build from Source

#### Prerequisites

1. Install [Go](https://golang.org/doc/install) (1.18 or newer)
2. Install [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)

#### Building the Tool

```bash
git clone https://github.com/fx64b/skool-downloader
cd skool-downloader

go build
```

## Usage

### Basic Usage

_**Recommended:** Using email/password for authentication_

```bash
./skool-downloader -url="https://skool.com/yourschool/classroom/your-classroom" -email="your@email.com" -password="yourpassword"
```

_Alternative: Using cookies for authentication_

```bash
./skool-downloader -url="https://skool.com/yourschool/classroom/your-classroom" -cookies="cookies.json"
```

> **Note:** Email/password authentication is more reliable as it handles session management automatically. Cookie-based authentication may fail if cookies expire or are invalid.

<br/>

### Command Line Options

| Option      | Description                                          | Default        |
| ----------- | ---------------------------------------------------- | -------------- |
| `-url`      | URL of the skool.com classroom page                  | **(required)** |
| `-email`    | Email for Skool login (recommended auth method)      | -              |
| `-password` | Password for Skool login (used with email)           | -              |
| `-cookies`  | Path to cookies file (alternative to email/password) | -              |
| `-output`   | Directory to save videos                             | `downloads`    |
| `-wait`     | Page load wait time in seconds                       | `2`            |
| `-headless` | Run browser headless (set to `false` for debugging)  | `true`         |

### Docker Usage

Run the tool in a containerized environment with all dependencies included:

```bash
# Build image
docker build -t skool-downloader .

# Run container with email/password authentication
docker run -v $(pwd)/downloads:/data skool-downloader \
  -url="https://skool.com/yourschool/classroom/path" \
  -email="your@email.com" \
  -password="yourpassword"

# Run with cookies file
docker run -v $(pwd)/downloads:/data -v $(pwd)/cookies.json:/cookies.json skool-downloader \
  -url="https://skool.com/yourschool/classroom/path" \
  -cookies="/cookies.json"
```

The Docker image includes:

- Chrome/Chromium for browser automation
- yt-dlp for video downloads
- ffmpeg for video processing
- All Go dependencies

## Getting Cookies (if needed)

If you choose to use cookies instead of email/password:

1. Install a browser extension like "Cookie-Editor" (Chrome) or "Cookie Quick Manager" (Firefox)
2. Log in to your Skool.com account
3. Export cookies as JSON or Netscape format
4. Save the file and use it with the `-cookies` parameter

## Troubleshooting

- **No videos found**: Verify your authentication and classroom URL
- **Authentication fails**: Use email/password instead of cookies
- **Page loads incomplete**: Increase wait time with `-wait=5` or higher
- **Download errors**: Update yt-dlp (`pip install -U yt-dlp`)
- **Login issues**: Try `-headless=false` to see the browser and debug
- **Specific video errors**: Check if the video is still available on Loom

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Development and Testing

### Running Tests

This project includes comprehensive unit and integration tests.

#### Unit Tests

Run unit tests with coverage:

```bash
# Run all tests
go test -v ./...

# Run tests with coverage
go test -v -coverprofile=coverage.out -covermode=atomic ./...

# View coverage report
go tool cover -func=coverage.out
```

The unit tests cover:

- Loom and YouTube URL extraction from HTML
- Cookie parsing (JSON and Netscape formats)
- Cookie format conversion
- Utility functions

#### Integration Tests

Run Docker-based integration tests to verify the full application with yt-dlp:

```bash
# Make the script executable (first time only)
chmod +x test-integration.sh

# Run integration tests
./test-integration.sh
```

The integration tests verify:

- Docker image builds successfully
- Binary is executable in the container
- yt-dlp is installed and functional
- Chromium is available
- ffmpeg is available
- Proper error handling

### Continuous Integration

The project uses GitHub Actions for automated testing:

1. **Lint and Build** (`lint-and-build.yml`): Runs on every push and PR
    - Lints code with golangci-lint
    - Builds the project
    - Runs unit tests with coverage reporting

2. **Docker Integration Tests** (`docker-integration-test.yml`): Runs on every push and PR
    - Builds the Docker image
    - Runs integration tests in a containerized environment

### Creating Releases (Maintainers)

To create a new release with cross-platform binaries:

1. Go to the [Actions tab](https://github.com/fx64b/skool-downloader/actions)
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Enter the desired version (e.g., `v2.0.0`)
5. Click "Run workflow"

The workflow will automatically:

- Build binaries for all supported platforms
- Create a new GitHub release
- Attach all binaries to the release

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/Fx64b/skool-downloader/blob/main/LICENSE) file for details.
