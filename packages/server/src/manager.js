'use strict'

const { types, unpack, broadcast } = require('@rooms/protocol')
const { debug, decode, encode } = require('./utils')
const createBus = require('./bus')

const log = debug('manager')

const createManager = (server, options) => {
  const { engine, transform, rooms, terminateOnDispose, terminateDisposeTimeout } = options
  const DEFAULT_ERROR_MESSAGE = 'Unknown error'
  const DEFAULT_ERROR_CODE = 400
  const getBus = createBus(options)

  const sendEvent = (ns, type, data, to = [], not = []) => {
    if (type === types.DISPOSE && terminateOnDispose) {
      setTimeout(terminate, terminateDisposeTimeout, ns)
    }
    log('broadcasting %s to %s with %j', type, ns, data, to, not)
    return broadcast(server, ns, type, data, { to, not, transform })
  }

  const terminate = ns => {
    server.clients.forEach(socket => {
      if (socket.ns === ns) socket.close(410, 'disposed')
    })
  }

  const onMessage = async (socket, ns, id, data) => {
    const msg = unpack(data) || {}

    if (msg.type === types.PONG) {
      return socket.emit('pong', msg.data)
    }
    const bus = getBus(ns)
    const room = await rooms(ns, { bus })

    onCommand(room, {...msg, id})
  }

  const onEvent = (room, [type, data, to, not]) => {
    room.emit('event', data)
    sendEvent(room.ns, type, data, to, not)
  }

  const onCommand = async (room, { type, id, data }) => {
    data = data || {}
    log('incoming command %s from %s with %j', type, id, data)
    try {
      switch (type) {
        case types.JOIN:
          return await room.join(id, data)
        case types.LEAVE:
          return await room.leave(id, data)
        case types.DATA:
          return await room.data(id, data)
        default:
          break
      }
    } catch (error) {
      error = error || {}
      if (!error.code) error.code = DEFAULT_ERROR_CODE
      if (!error.message) error.message = DEFAULT_ERROR_MESSAGE

      console.log(error)
      sendEvent(room.ns, types.ERROR, [error.message, error.code], id)
    }
  }

  const createRoom = async (ns, handler = () => {}) => {
    const bus = getBus(ns)
    const room = await rooms(ns, { bus })

    if(!bus.cached){
      bus.on('event', onEvent.bind(null, room))
    }
    if(!room.cached){
      room.on('dispose', () => setTimeout(bus.dispose, 1000))
      handler(room)
    }
    return room
  }

  return async (socket, handler) => {
    const { id, ns, user, query } = socket

    const room = await createRoom(ns, handler)

    const data = { ...query }

    if (user) data.user = user

    log('client %s joiningggg room %s with data %j', id, ns, data)
    room.join(id, socket)
    socket.on('disconnect', () => room.leave(id, {}))
    return socket.on('message', onMessage.bind(null, socket, ns, id))
  }
}

module.exports = createManager
