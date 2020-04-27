'use strict'

const ms = require('ms')
const rc = require('rc')
const { toBoolean } = require('./src/utils')

module.exports = rc('rooms', {
  port: process.env.PORT || 9000,
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  roomTimeout: ms(process.env.ROOM_TIMEOUT || '30s'),
  terminateDisposeTimeout: ms(process.env.TERMINATE_DISPOSE_TIMEOUT || '30s'),
  terminateOnDispose: toBoolean(process.env.TERMINATE_ON_DISPOSE || true),
  disableRoomTimeout: toBoolean(process.env.DISABLE_ROOM_TIMEOUT || false),
  wsEngine: 'ws'
})
