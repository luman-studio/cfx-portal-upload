# CFX Portal Upload Action

GitHub Action for automatically uploading FiveM resources to the CFX Portal.

<br>

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Parameters](#parameters)
- [escrow_ignore](#escrow_ignore)
- [Keeping Cookie Active](#keeping-cookie-active)
- [Troubleshooting](#troubleshooting)

<br>

## Quick Start

### 1. Create Asset on CFX Portal

Go to [portal.cfx.re](https://portal.cfx.re) and create an asset for your resource. Note the **asset name** — you'll need it later.

### 2. Get Authentication Cookie

1. Open [forum.cfx.re](https://forum.cfx.re) and log in
2. Open browser DevTools (`F12`)
3. Navigate to **Application** → **Cookies** → `https://forum.cfx.re`
4. Find the cookie named `_t` and copy its value

### 3. Add Secret to GitHub

1. Open your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Set name as `FORUM_COOKIE` and paste the cookie value

### 4. Create Workflow File

Create `.github/workflows/upload.yml`:

```yaml
name: Upload to CFX Portal

on:
  push:
    branches: [main, master]

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Upload to CFX Portal
        uses: luman-studio/cfx-portal-upload@main
        with:
          cookie: ${{ secrets.FORUM_COOKIE }}
          escrowed: |
            asset_name: "your-resource-name"
```

### 5. Configure fxmanifest.lua

Specify which files should remain unencrypted:

```lua
fx_version 'cerulean'
game 'gta5'

name 'My Resource'
author 'Your Name'
version '1.0.0'
description 'Description of your resource'

escrow_ignore {
  'config.lua',
  'shared/config.lua',
  'locales/*.lua',
}

client_script 'client/*.lua'
server_script 'server/*.lua'
shared_script 'shared/*.lua'
```

### 6. Push Changes

```bash
git add .
git commit -m "My changes"
git push origin main
```

The action will automatically upload your resource to the portal.

<br>

## Configuration

### Escrowed + OpenSource Versions

```yaml
- name: Upload to CFX Portal
  uses: luman-studio/cfx-portal-upload@main
  with:
    cookie: ${{ secrets.FORUM_COOKIE }}
    escrowed: |
      asset_name: "my-resource"
    openSource: |
      asset_name: "my-resource-source"
```

### HQ/LQ Versions (Different Branches)

For resources with multiple quality levels:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- name: Upload to CFX Portal
  uses: luman-studio/cfx-portal-upload@main
  with:
    cookie: ${{ secrets.FORUM_COOKIE }}
    hq: |
      asset_name: "my-resource-hq"
      branch: "main"
    lq: |
      asset_name: "my-resource-lq"
      branch: "low-quality"
```

> **Note:** `fetch-depth: 0` is required to access other branches.

<br>

## Parameters

### Action Inputs

| Parameter    | Type    | Required | Description                                      |
|--------------|---------|----------|--------------------------------------------------|
| `cookie`     | string  | Yes      | Value of `_t` cookie from forum.cfx.re           |
| `escrowed`   | yaml    | No       | Escrowed version configuration                   |
| `openSource` | yaml    | No       | Open source version configuration                |
| `hq`         | yaml    | No       | HQ version configuration                         |
| `lq`         | yaml    | No       | LQ version configuration                         |
| `skipUpload` | boolean | No       | Skip upload, authenticate only                   |

### Version Configuration

| Parameter    | Description                                          |
|--------------|------------------------------------------------------|
| `asset_name` | Asset name on the portal (case-sensitive)            |
| `asset_id`   | Asset ID (alternative to asset_name)                 |
| `branch`     | Git branch to use (only for hq/lq)                   |

<br>

## escrow_ignore

The action preserves your `escrow_ignore` configuration for escrowed versions. You control which files remain unencrypted through your `fxmanifest.lua`.

For **openSource** versions, the action automatically sets `escrow_ignore { '**/*' }` so all files remain open.

```lua
escrow_ignore {
  'config.lua',
  'shared/config.lua',
  'locales/*.lua',
}
```

<br>

## Keeping Cookie Active

The cookie may expire due to inactivity. Add a scheduled workflow to keep it active:

```yaml
name: Refresh Cookie

on:
  schedule:
    - cron: '0 0 * * *'

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Keep cookie alive
        uses: luman-studio/cfx-portal-upload@main
        with:
          cookie: ${{ secrets.FORUM_COOKIE }}
          skipUpload: true
```

<br>

## Troubleshooting

**"No assets found matching..."**
- Verify the asset name matches exactly (case-sensitive)

**"Authentication failed"**
- Cookie has expired — obtain a new one from forum.cfx.re
- Do not log out after copying the cookie; clear it from your browser instead

**"asset must not contain an archive"**
- Archive files (.zip, .rar, .7z) are automatically excluded, but avoid storing them in the repository

<br>

## Contributing

1. Fork the repository
2. Create a branch for your changes
3. Make changes
4. Create a Pull Request
