import { google } from 'googleapis'
import { decrypt } from '@/lib/crypto'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime: string
  modifiedTime: string
  webViewLink?: string
}

export interface DriveFolder {
  id: string
  name: string
  files: DriveFile[]
  folders: DriveFolder[]
}

export class DriveClient {
  private auth: any
  private drive: any

  constructor(accessToken: string, refreshToken?: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.auth = oauth2Client
    this.drive = google.drive({ version: 'v3', auth: oauth2Client })
  }

  async listFolderContents(folderId: string): Promise<DriveFolder> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)',
        pageSize: 1000,
      })

      const files = response.data.files || []
      const folder: DriveFolder = {
        id: folderId,
        name: 'Root Folder',
        files: files.filter((file: any) => !file.mimeType.includes('folder')),
        folders: [],
      }

      // Get subfolders
      const subfolders = files.filter((file: any) => file.mimeType.includes('folder'))
      for (const subfolder of subfolders) {
        const subfolderContents = await this.listFolderContents(subfolder.id)
        subfolderContents.name = subfolder.name
        folder.folders.push(subfolderContents)
      }

      return folder
    } catch (error) {
      console.error('Error listing folder contents:', error)
      throw new Error('Failed to list folder contents')
    }
  }

  async downloadFile(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        {
          responseType: 'text',
        }
      )

      return response.data as string
    } catch (error) {
      console.error('Error downloading file:', error)
      throw new Error('Failed to download file')
    }
  }

  async getFileMetadata(fileId: string): Promise<any> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink',
      })

      return response.data
    } catch (error) {
      console.error('Error getting file metadata:', error)
      throw new Error('Failed to get file metadata')
    }
  }

  async refreshAccessToken(): Promise<string> {
    try {
      const { credentials } = await this.auth.refreshAccessToken()
      this.auth.setCredentials(credentials)
      return credentials.access_token
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw new Error('Failed to refresh access token')
    }
  }
}

export async function createDriveClientFromEncrypted(
  encryptedAccessToken: string,
  encryptedRefreshToken?: string
): Promise<DriveClient> {
  try {
    const accessToken = await decrypt(encryptedAccessToken)
    const refreshToken = encryptedRefreshToken ? await decrypt(encryptedRefreshToken) : undefined

    return new DriveClient(accessToken, refreshToken)
  } catch (error) {
    console.error('Error creating drive client:', error)
    throw new Error('Failed to create drive client')
  }
}

export function isTextFile(mimeType: string): boolean {
  const textMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
    'application/rtf',
    'application/pdf',
  ]

  return (
    textMimeTypes.some((type) => mimeType.includes(type)) ||
    mimeType.startsWith('text/') ||
    mimeType.includes('document')
  )
}

export function isGoogleDoc(mimeType: string): boolean {
  return [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.presentation',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.drawing',
  ].includes(mimeType)
}
