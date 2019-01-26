# Event daemon

[![Build Status](https://travis-ci.org/CatalysmsServerManager/Event-daemon.svg?branch=master)](https://travis-ci.org/CatalysmsServerManager/Event-daemon)
[![codecov](https://codecov.io/gh/CatalysmsServerManager/Event-daemon/branch/master/graph/badge.svg)](https://codecov.io/gh/CatalysmsServerManager/Event-daemon)

- [Documentation](https://catalysmsservermanager.github.io/Event-daemon/)
- [Discord](https://catalysm.net/discord)

# WIP
Gets events from a server and outputs to Redis

# Installation


## Redis

Enable keyevent/keyspace events for EXPIRE. This is done with the command
`CONFIG SET notify-keyspace-events KEx`

Or you can set it inside redis.conf
