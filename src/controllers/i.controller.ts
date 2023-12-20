import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { JWTPayload } from 'jose'
import { env } from 'process'
import fs from 'fs'
import imageTools from '@groupclaes/pcm-imagetools'
import Document from '../repositories/document.repository'
import sha1 from '../crypto'
let config = require('./config')

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
   * @route GET /{APP_VERSION}/i/:guid
   */
  fastify.get('/:guid', async function (request: FastifyRequest<{
    Params: {
      guid: string
    },
    Querystring: {
      s?: string
    }
  }>, reply: FastifyReply) {
    const start = performance.now()

    try {
      const s: string = request.query.s ?? 'source'

      let options: IToolsOptions = {
        size: config.imageSizeMap[s] ?? 800,
        quality: config.imageQualityMap[s] ?? config.defaultImageQuality,
        cache: config.cacheEnabled ?? false,
        // Enable webp automatically if the client supports it
        webp: (request.headers['accept'] && request.headers['accept'].indexOf('image/webp') > -1) ? true : false
      }
      const _guid: string = request.params.guid.toLowerCase()
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

        // if response size = source and mimetype is gif, return base file
        if (s === 'source') {
          return reply
            .send(fs.readFileSync(_fn).toString('utf8'))
        }

        const data = await imageTools.getImage(_fn, '/' + (config.imageSizeFileMap[options.size] ?? 'file'), etag, options)

        return reply
          .send(data)
      }
      return reply
        .code(404)
        .send()
    } catch (err) {
      return reply.error(err, 500, performance.now() - start)
    }
  })

  fastify.get('/:company/:objecttype/:documenttype', getByPath)
  fastify.get('/:company/:objecttype/:documenttype/:itemnum', getByPath)
  fastify.get('/:company/:objecttype/:documenttype/:itemnum/:language', getByPath)
}

/**
 * 
 * @param {FastifyRequest} req 
 * @param {FastifyReply} reply 
 * @returns 
 */
async function getByPath(request: FastifyRequest<{
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
    const repo = new Document(request.log)
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
      /** @type {string} */
      const _guid = response.result.guid.toLowerCase()
      /** @type {string} */
      const _fn = `${env['DATA_PATH']}/content/${_guid.substring(0, 2)}/${_guid}/file`

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
      return reply
        .code(400)
        .send()
    } else {
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

interface IToolsOptions {
  size: number,
  quality?: number
  cache?: boolean
  webp: boolean
}