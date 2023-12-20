import Fastify from '@groupclaes/fastify-elastic'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import process, { env } from 'process'
import FastifyEtag from '@fastify/etag'

import config from './config'
import iController from './controllers/i.controller'
import manageController from './controllers/manage.controller'

let fastify: FastifyInstance | undefined

/** Main loop */
async function main() {
  // add jwt configuration object to config
  fastify = await Fastify({ ...config.wrapper })
  const version_prefix = (env.APP_VERSION ? '/' + env.APP_VERSION : '')
  fastify.register(FastifyEtag)
  await fastify.register(iController, { prefix: `${version_prefix}/${config.wrapper.serviceName}`, logLevel: 'info' })
  await fastify.register(manageController, { prefix: `${version_prefix}/${config.wrapper.serviceName}/manage`, logLevel: 'info' })
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
        .redirect(301, `https://pcm.groupclaes.be/v3/i/dis/artikel/foto/${itemNum}?s=${size}`)
    }
  })
  await fastify.listen({ port: +(env['PORT'] ?? 80), host: '::' })
}

['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, async () => {
    await fastify?.close()
    process.exit(0)
  })
})

main()