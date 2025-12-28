export interface ReUploadResponse {
  asset_id: number
  errors: null
}

export interface Asset {
  id: number
  name: string
}

export interface SearchResponse {
  items: Asset[]
}

export interface SSOResponseBody {
  url: string
}

export enum Urls {
  API = 'https://portal-api.cfx.re/v1/',
  SSO = 'auth/discourse?return=',
  REUPLOAD = 'assets/{id}/re-upload',
  UPLOAD_CHUNK = 'assets/{id}/upload-chunk',
  COMPLETE_UPLOAD = 'assets/{id}/complete-upload'
}

export interface AssetConfig {
  asset_id?: string
  asset_name?: string
}

export type VersionType = 'escrowed' | 'opensource'

export interface VersionConfig {
  type: VersionType
  assetName: string
  resourcePath?: string
}

export interface BuildOptions {
  createEscrowed: boolean
  createOpenSource: boolean
  escrowedConfig?: AssetConfig
  openSourceConfig?: AssetConfig
  resourcePath?: string
}

export interface ZipPaths {
  escrowed?: string
  openSource?: string
}
