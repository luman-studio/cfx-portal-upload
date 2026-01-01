import * as core from '@actions/core'
import axios from 'axios'

export interface DiscordNotifyOptions {
  webhookUrl: string
  assetName: string
  success: boolean
  deployed?: boolean
  deployHost?: string
  resourceName?: string
  error?: string
}

/**
 * Send notification to Discord webhook
 */
export async function sendDiscordNotification(
  options: DiscordNotifyOptions
): Promise<void> {
  const {
    webhookUrl,
    assetName,
    success,
    deployed,
    deployHost,
    resourceName,
    error
  } = options

  if (!webhookUrl) {
    return
  }

  core.info('Sending Discord notification...')

  const repoName = process.env.GITHUB_REPOSITORY || 'Unknown'
  const runUrl =
    process.env.GITHUB_SERVER_URL &&
    process.env.GITHUB_REPOSITORY &&
    process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null

  const embed: any = {
    title: success ? '✅ Upload Successful' : '❌ Upload Failed',
    color: success ? 0x00ff00 : 0xff0000,
    fields: [
      {
        name: 'Asset',
        value: assetName || 'Unknown',
        inline: true
      },
      {
        name: 'Repository',
        value: repoName,
        inline: true
      }
    ],
    timestamp: new Date().toISOString()
  }

  if (success && deployed) {
    embed.fields.push({
      name: 'Deployed',
      value: `✅ ${resourceName || assetName} → ${deployHost}`,
      inline: false
    })
  }

  if (!success && error) {
    embed.fields.push({
      name: 'Error',
      value: error.substring(0, 1000),
      inline: false
    })
  }

  if (runUrl) {
    embed.fields.push({
      name: 'Action Run',
      value: `[View Details](${runUrl})`,
      inline: false
    })
  }

  try {
    await axios.post(webhookUrl, {
      embeds: [embed]
    })
    core.info('Discord notification sent')
  } catch (err) {
    core.warning(`Failed to send Discord notification: ${err}`)
  }
}
