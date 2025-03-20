import Fastify from '@groupclaes/fastify-elastic'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { env } from 'process'
import FastifyEtag from '@fastify/etag'

import iController from './controllers/i.controller'
import manageController from './controllers/manage.controller'

const LOGLEVEL = 'debug'

export default async function (config: any): Promise<FastifyInstance | undefined> {
  if (!config || !config.wrapper) return
  if (!config.wrapper.mssql && config.mssql) config.wrapper.mssql = config.mssql

  const fastify = await Fastify({ ...config.wrapper })
  const version_prefix = (env.APP_VERSION ? '/' + env.APP_VERSION : '')
  fastify.register(FastifyEtag)
  fastify.log.level = LOGLEVEL
  await fastify.register(iController, { prefix: `${version_prefix}/${config.wrapper.serviceName}`, logLevel: LOGLEVEL })
  await fastify.register(manageController, { prefix: `${version_prefix}/${config.wrapper.serviceName}/manage`, logLevel: LOGLEVEL })

  fastify.route({
    method: 'GET',
    url: '/thumbnails/:itemNum',
    handler: async (request: FastifyRequest<{
      Params: {
        itemNum: string
      }
    }>, reply: FastifyReply) => {
      /** @type {string} */
      let itemNum = request.params.itemNum.split('.')[0]
      let size = 'small'

      if (itemNum.startsWith('280-')) {
        size = 'thumb_large'
        itemNum = itemNum.substring(4)
      }

      return reply
        .redirect(`https://pcm.groupclaes.be/v4/i/dis/artikel/foto/${itemNum}?s=${size}`, 301)
    }
  })
  await fastify.listen({ port: +(env['PORT'] ?? 80), host: '::' })
  return fastify
}