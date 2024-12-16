import server from './src'
const cfg = require('./config')

console.log('fastify starting');

const main = async function () {
  console.log('hello');
  const fastify = await server(cfg);
  console.log('fastify started');

  ['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, async () => {
      console.error('fastify stopped');
      await fastify?.close()
      process.exit(0)
    })
  })
}

main()