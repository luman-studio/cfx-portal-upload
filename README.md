# CFX Portal Upload Action

GitHub Action for automatically uploading FiveM resources to [portal.cfx.re](https://portal.cfx.re).

## Quick Start

### Step 1: Create Asset on CFX Portal

1. Go to [portal.cfx.re](https://portal.cfx.re)
2. Create an asset for your resource
3. Remember the **asset name** - you'll need it in the config

### Step 2: Get Authentication Cookie

1. Open [forum.cfx.re](https://forum.cfx.re) and log in
2. Open browser DevTools (F12)
3. Go to **Application** → **Cookies** → `https://forum.cfx.re`
4. Find cookie named `_t` and copy its **value**

### Step 3: Add Secret to GitHub

1. Open your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FORUM_COOKIE`
5. Value: paste the copied `_t` cookie value

### Step 4: Create Workflow File

Create `.github/workflows/upload.yml` in your repository:

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

### Step 5: Configure fxmanifest.lua

In your `fxmanifest.lua`, specify which files should NOT be encrypted:

```lua
fx_version 'cerulean'
game 'gta5'

name 'My Resource'
author 'Your Name'
version '1.0.0'
description 'Description of your resource'

-- Files that will remain open (not encrypted)
escrow_ignore {
  'config.lua',
  'shared/config.lua',
  'locales/*.lua',
}

client_script 'client/*.lua'
server_script 'server/*.lua'
shared_script 'shared/*.lua'
```

### Step 6: Push to Main

```bash
git add .
git commit -m "My changes"
git push origin main
```

After pushing, GitHub Action will automatically upload the resource to the portal.

---

## Configuration Examples

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

For resources with different quality levels (e.g., different textures):

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Important! Required to access other branches

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

---

## Parameters

| Parameter  | Type   | Description |
|------------|--------|-------------|
| `cookie`   | string | **Required.** Value of `_t` cookie from forum.cfx.re |
| `escrowed` | yaml   | Escrowed version configuration |
| `openSource` | yaml | Open source version configuration |
| `hq`       | yaml   | HQ version configuration (with branch) |
| `lq`       | yaml   | LQ version configuration (with branch) |
| `skipUpload` | boolean | Skip upload (authentication only) |

### Version Parameters (escrowed, openSource, hq, lq)

| Parameter   | Description |
|-------------|-------------|
| `asset_name` | Asset name on the portal (exactly as you named it when creating) |
| `asset_id`  | Asset ID (alternative to asset_name) |
| `branch`    | Git branch (only for hq/lq) |

---

## How escrow_ignore Works

The action **does not modify** your `escrow_ignore` configuration for escrowed versions. You fully control which files to encrypt through your `fxmanifest.lua`.

For **openSource** versions, the action automatically sets `escrow_ignore { '**/*' }` - all files remain open.

**Example fxmanifest.lua:**

```lua
-- These files will NOT be encrypted
escrow_ignore {
  'config.lua',           -- configuration
  'shared/config.lua',    -- shared configuration
  'locales/*.lua',        -- all localization files
}
```

---

## Keeping Cookie Active

Cookie becomes invalid due to inactivity. Add a cron job:

```yaml
name: Refresh Cookie

on:
  schedule:
    - cron: '0 0 * * *'  # Every day at midnight

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

---

## Troubleshooting

### "No assets found matching..."
- Check that asset name in config **exactly matches** the name on the portal
- Names are case-sensitive

### "Authentication failed"
- Cookie expired - get a new one from forum.cfx.re
- After getting the cookie, **do not log out** from the forum. You should clear the cookie from your browser and log in again to avoid potential issues.

### "asset must not contain an archive"
- Remove .zip, .rar, .7z files from the repository - they are automatically excluded, but better not to store them

---

## Contributing

1. Fork the repository
2. Create a branch for your changes
3. Make changes
4. Create a Pull Request

[![GitHub Super-Linter](https://github.com/luman-studio/cfx-portal-upload/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/luman-studio/cfx-portal-upload/actions/workflows/ci.yml/badge.svg)
