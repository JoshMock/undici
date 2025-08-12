'use strict'

const { tspl } = require('@matteo.collina/tspl')
const { test } = require('node:test')
const { request } = require('..')
const http = require('node:http')

test('inflight and close', async (t) => {
  t = tspl(t, { plan: 3 })

  const server = http.createServer({ joinDuplicateHeaders: true }, (req, res) => {
    console.log('request received')
    res.writeHead(200)
    res.end('Response body')
    res.socket.end() // Close the connection immediately with every response
  }).listen(0, '127.0.0.1', function () {
    const url = `http://127.0.0.1:${this.address().port}`
    request(url)
      .then(({ statusCode, headers, body }) => {
        console.log('first response')
        t.ok(true, 'first response')
        body.resume()
        body.on('close', function () {
          t.ok(true, 'first body closed')
        })
        return request(url)
          .then(({ statusCode, headers, body }) => {
            console.log('second response')
            t.ok(true, 'second response')
            body.resume()
            body.on('close', function () {
              console.log('closing server')
              server.close()
            })
          })
      }).catch((err) => {
        t.ifError(err)
      })
  })
  await t.completed
})

test('inflight and close async', async (t) => {
  t = tspl(t, { plan: 3 })

  const server = http.createServer({ joinDuplicateHeaders: true }, (_req, res) => {
    console.log('async: request received')
    res.writeHead(200)
    res.end('Response body')
    res.socket.end() // Close the connection immediately with every response
  }).listen(0, '127.0.0.1', async function () {
    const url = `http://127.0.0.1:${this.address().port}`

    try {
      const { body: body1 } = await request(url)
      console.log('async first response')
      t.ok(true, 'first response')
      body1.resume()
      body1.on('close', () => t.ok(true, 'first body closed'))

      const { body: body2 } = await request(url)
      console.log('async second response')
      t.ok(true, 'second response')
      body2.resume()
      body2.on('close', () => {
        console.log('async: closing server')
        server.close()
      })
    } catch (err) {
      t.ifError(err)
    }
  })

  await t.completed
})
