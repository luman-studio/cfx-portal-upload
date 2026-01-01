import * as core from '@actions/core'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { Client } from 'ssh2'
import {
  SSHConfig,
  DeployConfig,
  PortalAsset,
  PortalAssetsResponse
} from './types'

const PORTAL_API = 'https://portal-api.cfx.re/v1'

/**
 * Find asset by name from CFX Portal
 */
async function findAssetByName(
  cookie: string,
  assetName: string
): Promise<PortalAsset> {
  core.info(`Searching for asset: "${assetName}"...`)

  let page = 1
  const maxPages = 10

  while (page <= maxPages) {
    const url = `${PORTAL_API}/me/assets?page=${page}&search=${encodeURIComponent(assetName)}&sort=asset.id&direction=desc`

    const response = await axios.get<PortalAssetsResponse>(url, {
      headers: { Cookie: cookie }
    })

    const asset = response.data.items.find(a => a.name === assetName)
    if (asset) {
      core.info(`Found asset: "${asset.name}" (ID: ${asset.id})`)
      return asset
    }

    if (page >= response.data.page_count) break
    page++
  }

  throw new Error(`Asset "${assetName}" not found on CFX Portal`)
}

/**
 * Download asset from CFX Portal
 */
export async function downloadAsset(
  cookie: string,
  assetName: string,
  resourceName: string
): Promise<string> {
  core.info(`Downloading asset "${assetName}" from CFX Portal...`)

  // Find asset
  const asset = await findAssetByName(cookie, assetName)

  if (!asset.versions || asset.versions.length === 0) {
    throw new Error(`Asset "${assetName}" has no versions`)
  }

  const version = asset.versions.find(v => v.state === 'active')
  if (!version) {
    throw new Error(`Asset "${assetName}" has no active versions`)
  }

  if (!version.packs || version.packs.length === 0) {
    throw new Error(`Version ${version.id} has no packs`)
  }

  const pack = version.packs[0]

  core.info(`Asset ID: ${asset.id}, Version ID: ${version.id}, Pack ID: ${pack.id}`)

  // Download
  const downloadUrl = `${PORTAL_API}/assets/${asset.id}/versions/${version.id}/packs/${pack.id}/download`
  core.info(`Downloading from: ${downloadUrl}`)

  const response = await axios.get(downloadUrl, {
    headers: { Cookie: cookie },
    responseType: 'arraybuffer',
    maxRedirects: 5
  })

  const zipPath = path.join(process.cwd(), `${resourceName}.zip`)
  fs.writeFileSync(zipPath, response.data)

  const fileSizeKB = Math.round(response.data.length / 1024)
  core.info(`Downloaded: ${zipPath} (${fileSizeKB} KB)`)

  return zipPath
}

/**
 * Deploy asset to server via SSH
 */
export async function deployToServer(
  sshConfig: SSHConfig,
  deployPath: string,
  resourceName: string,
  zipPath: string
): Promise<void> {
  core.info(`Deploying "${resourceName}" to ${sshConfig.host}...`)

  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', () => {
      core.info('SSH connection established')

      conn.sftp((err, sftp) => {
        if (err) {
          conn.end()
          reject(err)
          return
        }

        const remoteTempPath = `/tmp/${resourceName}.zip`
        const remoteResourcePath = `${deployPath}/${resourceName}`

        core.info(`Uploading to ${remoteTempPath}...`)

        const fileData = fs.readFileSync(zipPath)

        sftp.writeFile(remoteTempPath, fileData, uploadErr => {
          if (uploadErr) {
            conn.end()
            reject(uploadErr)
            return
          }

          core.info('Upload complete')
          core.info(`Extracting to ${remoteResourcePath}...`)

          const commands = [
            `rm -rf "${remoteResourcePath}"`,
            `mkdir -p "${remoteResourcePath}"`,
            `unzip -o "${remoteTempPath}" -d "${remoteResourcePath}"`,
            `rm "${remoteTempPath}"`,
            // Fix structure if zip contains single folder
            `cd "${remoteResourcePath}" && if [ $(ls -d */ 2>/dev/null | wc -l) -eq 1 ] && [ $(ls -A | wc -l) -eq 1 ]; then subdir=$(ls -d */); mv "$subdir"* . 2>/dev/null || true; mv "$subdir".* . 2>/dev/null || true; rmdir "$subdir" 2>/dev/null || true; fi`
          ]

          const fullCommand = commands.join(' && ')

          conn.exec(fullCommand, (execErr, stream) => {
            if (execErr) {
              conn.end()
              reject(execErr)
              return
            }

            let output = ''
            let errorOutput = ''

            stream.on('data', (data: Buffer) => {
              output += data.toString()
            })

            stream.stderr.on('data', (data: Buffer) => {
              errorOutput += data.toString()
            })

            stream.on('close', (code: number) => {
              conn.end()

              if (code !== 0) {
                core.warning(`Command output: ${output}`)
                core.error(`Command error: ${errorOutput}`)
                reject(new Error(`SSH command failed with code ${code}`))
                return
              }

              core.info(`Resource deployed to ${remoteResourcePath}`)
              resolve()
            })
          })
        })
      })
    })

    conn.on('error', err => {
      reject(new Error(`SSH connection error: ${err.message}`))
    })

    core.info(`Connecting to ${sshConfig.host}:${sshConfig.port}...`)

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      privateKey: sshConfig.privateKey
    })
  })
}

/**
 * Main deploy function - downloads from portal and deploys via SSH
 */
export async function deployAsset(
  cookie: string,
  assetName: string,
  deployConfig: DeployConfig
): Promise<void> {
  if (!deployConfig.enabled || !deployConfig.sshConfig) {
    return
  }

  core.info('')
  core.info('='.repeat(50))
  core.info('Starting deployment...')
  core.info('='.repeat(50))

  const resourceName = deployConfig.resourceName || assetName

  // Download asset from portal
  const zipPath = await downloadAsset(cookie, assetName, resourceName)

  // Deploy to server
  await deployToServer(
    deployConfig.sshConfig,
    deployConfig.deployPath,
    resourceName,
    zipPath
  )

  // Cleanup
  try {
    fs.unlinkSync(zipPath)
  } catch {
    // Ignore cleanup errors
  }

  core.info('')
  core.info('Deployment completed successfully!')
}
