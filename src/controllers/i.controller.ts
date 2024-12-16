import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import sql from 'mssql'
import { JWTPayload } from 'jose'
import { env } from 'process'
import fs from 'fs'
import imageTools, { ImageOptions } from '@groupclaes/pcm-imagetools'
import Document from '../repositories/document.repository'
import sha1 from '../crypto'
let config = require('./config')

declare module 'fastify' {
  export interface FastifyInstance {
    getSqlPool: (name?: string) => Promise<sql.ConnectionPool>
  }
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
   * @route GET /{APP_VERSION}/i/:guid
   */
  fastify.get('/:guid', async function (request: FastifyRequest<{
    Params: {
      guid: string
    },
    Querystring: {
      s?: string,
      ext?: string
    }
  }>, reply: FastifyReply) {
    const start = performance.now()

    try {
      const s: string = request.query.s ?? 'source'

      let options: any = {
        size: config.imageSizeMap[s] ?? 800,
        quality: config.imageQualityMap[s] ?? config.defaultImageQuality,
        cache: config.cacheEnabled ?? false,
        // Enable webp automatically if the client supports it
        webp: (request.headers['accept'] && request.headers['accept'].indexOf('image/webp') > -1) ? true : false
      }
      const _guid: string = request.params.guid.toLowerCase()
      const _fn: string = `${env['DATA_PATH']}/content/${_guid.substring(0, 2)}/${_guid}/file`

      if (request.query.ext) {
        options.quality = 100
        options.format = request.query.ext
      }

      if (request.query.s === 'original')
        options.size = 0

      if (fs.existsSync(_fn)) {
        const lastMod = fs.statSync(_fn).mtime
        const etag = sha1(lastMod.toISOString())

        reply.header('Cache-Control', 'must-revalidate, max-age=172800, private')
          .header('image-color', await imageTools.getColor(_fn, options))
          .header('image-guid', _guid)
          .header('Expires', new Date(new Date().getTime() + 172800000).toUTCString())
          .header('Last-Modified', lastMod.toUTCString())
          .type(resolveMimeType(options))
          .header('etag', etag)

        // if response size = source and mimetype is gif, return base file
        if (s === 'source')
          return reply
            .send(fs.readFileSync(_fn).toString('utf8'))

        const data = await imageTools.getImage(_fn, '/' + (config.imageSizeFileMap[options.size] ?? 'file'), etag, options)

        return reply
          .send(data)
      }
      request.log.fatal({
        params: {
          guid: request.params.guid.toLowerCase()
        }
      }, 'file not found')
      return reply
        .code(404)
        .send()
    } catch (err) {
      return reply.error(err, 500, performance.now() - start)
    }
  })

  const getByPath = async function (request: FastifyRequest<{
    Params: {
      company: string
      objecttype: string
      documenttype: string
      itemnum?: string
      language?: string
    }, Querystring: {
      swp?: boolean
      size?: string
      s?: string
    }
  }>, reply) {
    try {
      const pool = await fastify.getSqlPool()
      const repo = new Document(request.log, pool)
      const s: string = request.query.s ?? 'source'

      let options = {
        size: config.imageSizeMap[s] ?? 800,
        quality: config.imageQualityMap[s] ?? config.defaultImageQuality,
        cache: config.cacheEnabled ?? false,
        // Enable webp automatically if the client supports it
        webp: (request.headers['accept'] && request.headers['accept'].indexOf('image/webp') > -1) ? true : false
      }

      // get file guid for request
      const response = await repo.getGuidByParams(request.params.company, request.params.objecttype, request.params.documenttype, request.params.itemnum ?? '100', request.params.language ?? 'nl', request.query.size ?? 'any', request.query.swp != undefined)

      if (response) {
        const _guid: string = response.result.guid.toLowerCase()
        const _fn: string = `${env['DATA_PATH']}/content/${_guid.substring(0, 2)}/${_guid}/file`

        if (fs.existsSync(_fn)) {
          const lastMod = fs.statSync(_fn).mtime
          const etag = sha1(lastMod.toISOString())

          reply.header('Cache-Control', 'must-revalidate, max-age=172800, private')
            .header('image-color', await imageTools.getColor(_fn, options))
            .header('image-guid', _guid)
            .header('Expires', new Date(new Date().getTime() + 172800000).toUTCString())
            .header('Last-Modified', lastMod.toUTCString())
            .type(options.webp ? 'image/webp' : 'image/jpeg')
            .header('etag', etag)

          const data = await imageTools.getImage(_fn, '/' + (config.imageSizeFileMap[options.size] ?? 'file'), etag, options)

          return reply
            .send(data)
        }
        request.log.fatal({
          params: {
            guid: response.result.guid.toLowerCase()
          }
        }, 'file not found')
        return reply
          .code(400)
          .send()
      } else {
        request.log.debug({
          params: {
            company: request.params.company,
            objecttype: request.params.objecttype,
            documenttype: request.params.documenttype,
            itemnum: request.params.itemnum ?? '100',
            language: request.params.language ?? 'nl',
            size: request.query.size ?? 'any',
            swp: request.query.swp != undefined
          }
        }, 'no file found for given params')
        const data = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64')
        return reply.header('Cache-Control', 'must-revalidate, max-age=172800, private')
          .header('image-color', '#FFFFFF')
          .type('image/gif')
          .send(data)
      }
    } catch (err) {
      throw err
    }
  }

  fastify.get('/:company/:objecttype/:documenttype', getByPath)
  fastify.get('/:company/:objecttype/:documenttype/:itemnum', getByPath)
  fastify.get('/:company/:objecttype/:documenttype/:itemnum/:language', getByPath)
}

function resolveMimeType(options) {
  switch (options.format) {
    case 'png':
      return 'image/png'

    case 'gif':
      return 'image/gif'

    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'

    case 'webp':
      return 'image/webp'

    default:
      return options.webp ? 'image/webp' : 'image/jpeg'
  }
}