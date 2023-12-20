import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { JWTPayload } from 'jose'
import fs, { readdirSync } from 'fs'
import { env } from 'process'

declare module 'fastify' {
  export interface FastifyRequest {
    jwt: JWTPayload
    hasRole: (role: string) => boolean
    hasPermission: (permission: string, scope?: string) => boolean
  }

  export interface FastifyReply {
    success: (data?: any, code?: number, executionTime?: number) => FastifyReply
    fail: (data?: any, code?: number, executionTime?: number) => FastifyReply
    error: (message?: string, code?: number, executionTime?: number) => FastifyReply
  }
}

export default async function (fastify: FastifyInstance) {
  /**
   * Get all attribute entries from DB
   * @route GET /{APP_VERSION}/i/manage/flush-all
   */
  fastify.post('/flush-all', async function (request: FastifyRequest, reply: FastifyReply) {
    const start = performance.now()

    if (!request.jwt?.sub)
      return reply.fail({ jwt: 'missing authorization' }, 401)

    if (!request.hasPermission('delete', 'GroupClaes.PCM/document'))
      return reply.fail({ role: 'missing permission' }, 403)

    try {
      // Loop over all documents in pcm and delete generated resources
      const _fn: string = `${env['DATA_PATH']}/content`

      const dirs = getDirectories(_fn)
      const paths: string[] = []

      // only get top level folders with lenght of 2 chars
      for (const dir of dirs.filter((dir: string) => dir.length === 2)) {
        const subdirs = getDirectories(`${_fn}/${dir}`)
        for (const subdir of subdirs) {
          paths.push(`${dir}/${subdir}`)
        }
      }

      // Loop through the paths and find all the files
      // If file is found check for generated files, if found, delete them
      for (const path of paths) {
        const files: string[] = []

        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/image_small`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/image_small`)
          files.push(`${env['DATA_PATH']}/content/${path}/image_small_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/thumb`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/thumb`)
          files.push(`${env['DATA_PATH']}/content/${path}/thumb_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/thumb_m`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/thumb_m`)
          files.push(`${env['DATA_PATH']}/content/${path}/thumb_m_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/thumb_l`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/thumb_l`)
          files.push(`${env['DATA_PATH']}/content/${path}/thumb_l_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/thumb_large`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/thumb_large`)
          files.push(`${env['DATA_PATH']}/content/${path}/thumb_large_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/miniature`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/miniature`)
          files.push(`${env['DATA_PATH']}/content/${path}/miniature_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/image`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/image`)
          files.push(`${env['DATA_PATH']}/content/${path}/image_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/image_large`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/image_large`)
          files.push(`${env['DATA_PATH']}/content/${path}/image_large_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/image_large`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/image_large`)
          files.push(`${env['DATA_PATH']}/content/${path}/image_large_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/image_large`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/image_large`)
          files.push(`${env['DATA_PATH']}/content/${path}/image_large_etag`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/border-color_code`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/border-color_code`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/background-color_code`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/background-color_code`)
        }
        if (fs.existsSync(`${env['DATA_PATH']}/content/${path}/color_code`)) {
          files.push(`${env['DATA_PATH']}/content/${path}/color_code`)
        }

        if (files.length > 0) {
          await Promise.all(files.map(file => fs.unlink(file, console.error)))
        }
      }

      return reply.success({ paths, length: paths.length }, 200, performance.now() - start)
    } catch (err) {
      request.log.error({ err }, 'failed to get languages!')
      return reply.error('failed to get languages!')
    }
  })
}

function getDirectories(source: string): string[] {
  const folders: fs.Dirent[] = readdirSync(source, { withFileTypes: true })
  return folders
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
}
