---
title: 'Skool Loom Downloader - Technical Documentation'
description: 'A Go utility to automatically scrape and download Loom videos from Skool.com classrooms.'
lastUpdated: '2025-07-15'
author: 'Fx64b'
status: 'published'
projectSlug: 'skool-loom-dl'
version: '1.0.1 (2025/04/21)'
readTime: '5 mins'
---

# Skool Loom Video Downloader

<div className="my-8 p-6 rounded-lg bg-primary/10 border-2 border-primary/20 text-center">
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 mb-4 text-sm font-medium">
    Launching Soon!
  </div>
  <h3 className="text-2xl font-bold mb-3">Hosted Solution Coming Soon!</h3>
  <p className="text-base mb-6 max-w-2xl mx-auto">Tired of the technical setup? I'm building a hosted solution that makes downloading Skool videos effortless - no installation, no command line, just simple one-click downloads.</p>
  <a href="https://skool.fx64b.dev" className="inline-block px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 mb-6" target="_blank" rel="noopener noreferrer">Join the Waitlist</a>
  <div className="text-sm max-w-xl mx-auto p-3 rounded-md bg-background/50 border border-primary/10 mb-4">
    <strong>Early Bird Bonus:</strong> Join now and get 1 month of Pro free when we launch! Pro includes 50 downloads per day, 30-day video retention, and bulk ZIP exports.
  </div>
</div>

**What you'll get with the hosted solution:**

<div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
    <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center mb-2 mx-auto">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
    </div>
    <h4 className="font-semibold text-center mb-1">One-Click Downloads</h4>
    <p className="text-sm text-center">Simple browser extension that adds a download button to every Skool video.</p>
  </div>
  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
    <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center mb-2 mx-auto">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    </div>
    <h4 className="font-semibold text-center mb-1">Bulk Downloads</h4>
    <p className="text-sm text-center">Download entire modules or courses at once with Pro. Save hours of time.</p>
  </div>
  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
    <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center mb-2 mx-auto">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    </div>
    <h4 className="font-semibold text-center mb-1">Progress Tracking</h4>
    <p className="text-sm text-center">Dashboard to track all your downloads, manage storage, and more.</p>
  </div>
</div>

## Overview

The Skool Loom Downloader is a Go-based CLI utility that I wrote over the weekend. I was about to leave a Skool community and wanted to download my favorite courses before leaving.
I couldn't figure out a simple way to download them manually, so I decided to vibe code this tool to automate the process.
In simple terms, it scrapes a Skool classroom page, based on the provided URL, and downloads all Loom videos from that page.

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

## Features

- Scrapes Loom video links from [Skool.com](https://skool.com) classroom pages
- Authentication via email/password or cookies
- Supports JSON and Netscape cookies.txt formats
- Downloads videos using yt-dlp with proper authentication
- Configurable page loading wait time
- Toggleable headless mode for debugging

## Installation

The installation process is straightforward. You can clone the repository and build the project using Go. Currently, the tool is not available as a pre-built binary, so you will need to compile it from source.

### Prerequisites

1. Install [Go](https://golang.org/doc/install) (1.18 or newer)
2. Install [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)

### Getting the Tool

Clone the repository and build the project:

```bash
git clone https://github.com/fx64b/skool-loom-dl
cd skool-loom-dl

go build
```

## Usage

### Basic Usage

_**Recommended:** Using email/password for authentication_

```bash
./skool-loom-dl -url="https://skool.com/yourschool/classroom/your-classroom" -email="your@email.com" -password="yourpassword"
```

_Alternative: Using cookies for authentication_

```bash
./skool-loom-dl -url="https://skool.com/yourschool/classroom/your-classroom" -cookies="cookies.json"
```

> Cookie based authentication is really not recommended, I barely get it to work, so I recommend using email/password instead

<br/>

### Command Line Options

| Option      | Description                                          | Default        |
| ----------- | ---------------------------------------------------- | -------------- |
| `-url`      | URL of the skool.com classroom page                  | **(required)** |
| `-email`    | Email for Skool login (recommended auth method)      | -              |
| `-password` | Password for Skool login (used with email)           | -              |
| `-cookies`  | Path to cookies file (alternative to email/password) | -              |
| `-output`   | Directory to save videos                             | `downloads`    |
| `-wait`     | Page load wait time in seconds                       | `5`            |
| `-headless` | Run browser headless (set to `false` for debugging)  | `true`         |

## Troubleshooting

- **No videos found**: Verify your authentication and classroom URL
- **Authentication fails**: Use email/password instead of cookies
- **Page loads incomplete**: Increase wait time with `-wait=5` or higher
- **Download errors**: Update yt-dlp (`pip install -U yt-dlp`)
- **Login issues**: Try `-headless=false` to see the browser and debug
- **Specific video errors**: Check if the video is still available on Loom

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/Fx64b/skool-loom-dl/blob/main/LICENSE) file for details.
