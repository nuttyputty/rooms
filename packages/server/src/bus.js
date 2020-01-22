const emitter = require('component-emitter')
const { types } = require('@rooms/protocol')
const {debug} = require('./utils')

module.exports = ({ engine }) => {
  const cache = new Map()

  return ns => {

    if (cache.has(ns)) return {...cache.get(ns), cached: true}

    const bus = emitter({})

    const bind = () => {
      engine.subscribe(ns, onEvent)
      return () => {
        process.nextTick(() => {
          engine.unsubscribe(ns, onEvent)
          bus.removeAllListeners()
        })
      }
    }

    const onEvent = data => {
      bus.emit('event', data)
    }

    bus.send = (type, data = {}, to = [], not = []) => {
      engine.publish(ns, [type, data, to, not])
    }

    bus.sendJoin = data => {
      bus.send(types.JOIN, data)
    }

    bus.sendData = ({ data, to, not }) => {
      bus.send(types.DATA, data, to, not)
    }

    bus.sendLeave = data => {
      bus.send(types.LEAVE, data)
    }

    bus.sendError = ({ data, to, not }) => {
      bus.send(types.ERROR, data, to, not)
    }

    bus.dispose = () => {
      bus.send(types.DISPOSE)
      process.nextTick(() => unbind(cache.delete(ns)))
    }

    const unbind = bind()
    cache.set(ns, bus)

    return bus
  }
}
