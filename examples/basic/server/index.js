const createServer = require('@rooms/server')
const room = require('./room')
const server = createServer({ wsEngine: 'cws' })

const auth = () => {
  return Promise.resolve({ name: 'Jonathan', nick: 'JB' })
}

server.room('/:id', room, { auth })
server.listen()
