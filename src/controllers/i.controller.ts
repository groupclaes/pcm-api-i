import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from 'process'
import fs from 'fs'
import imageTools, { ImageOptions } from '@groupclaes/pcm-imagetools'
import Document from '../repositories/document.repository'
import sha1 from '../crypto'
import { createReadStream } from 'node:fs'
import { ConnectionPool } from 'mssql'

let config: any = require('./config')

export default async function(fastify: FastifyInstance): Promise<void> {
  /**
   * Get all attribute entries from DB
   * @route GET /{APP_VERSION}/i/:guid
   */
  fastify.get('/:guid', async function(request: FastifyRequest<{
    Params: {
      guid: string
    },
    Querystring: {
      s?: string,
      ext?: string
    }
  }>, reply: FastifyReply): Promise<FastifyReply> {
    const start: number = performance.now()

    const s: string = request.query.s ?? 'source'
    const _guid: string = request.params.guid.toLowerCase()
    const _fn: string = `${env['DATA_PATH']}/content/${_guid.substring(0, 2)}/${_guid}/file`

    try {
      const pool: ConnectionPool = await fastify.getSqlPool()
      const repository = new Document(request.log, pool)

      let document: any = await repository.findOne({
        guid: _guid
      })
      if (!document)
        return reply
          .code(404)
          .send()

      let options: ImageToolsOptions = {
        size: config.imageSizeMap[s] ?? 800,
        quality: config.imageQualityMap[s] ?? config.defaultImageQuality,
        cache: config.cacheEnabled ?? false,
        // Enable webp automatically if the client supports it
        webp: request.headers['accept'] && request.headers['accept'].indexOf('image/webp') > -1
      }

      if (request.query.ext) {
        options.quality = 100
        options.format = request.query.ext
      }

      if (request.query.s === 'original')
        options.size = 0

      if (fs.existsSync(_fn)) {
        const lastMod: Date = fs.statSync(_fn).mtime
        const etag: any = sha1(lastMod.toISOString())

        reply.header('Cache-Control', 'must-revalidate, max-age=172800, private')
          .header('image-color', await imageTools.getColor(_fn, options))
          .header('image-guid', _guid)
          .header('Expires', new Date(new Date().getTime() + 172800000).toUTCString())
          .header('Last-Modified', lastMod.toUTCString())
          .header('etag', etag)

        const svg_compatible: boolean = request.headers.accept && request.headers.accept.indexOf('image/svg+xml') > -1

        // if response size = source return base file if it is supported
        if (s === 'source' && options.webp) {
          switch (document.mimeType) {
            case 'image/svg+xml':
              if (svg_compatible)
                return reply
                  .type(document.mimeType)
                  .send(createReadStream(_fn))
              break

            case 'image/webp':
              if (options.webp)
                return reply
                  .type(document.mimeType)
                  .send(createReadStream(_fn))
              break
          }
        }

        const data: Buffer = await imageTools.getImage(_fn, '/' + (config.imageSizeFileMap[options.size] ?? 'file'), etag, options)

        return reply
          .type(resolveMimeType(options))
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

  const getByPath = async function(request: FastifyRequest<{
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
  }>, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const pool = await fastify.getSqlPool()
      const repo = new Document(request.log, pool)
      const s: string = request.query.s ?? 'source'

      let options = {
        size: config.imageSizeMap[s] ?? 800,
        quality: config.imageQualityMap[s] ?? config.defaultImageQuality,
        cache: config.cacheEnabled ?? false,
        // Enable webp automatically if the client supports it
        webp: request.headers['accept'] && request.headers['accept'].indexOf('image/webp') > -1
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
      return reply
        .status(500)
        .send(err)
    }
  }

  fastify.get('/:company/:objecttype/:documenttype', getByPath)
  fastify.get('/:company/:objecttype/:documenttype/:itemnum', getByPath)
  fastify.get('/:company/:objecttype/:documenttype/:itemnum/:language', getByPath)
}

function resolveMimeType(options: ImageToolsOptions): string {
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

interface ImageToolsOptions extends ImageOptions {
  quality?: number
}