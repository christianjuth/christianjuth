const express = require('express')
const Fingerprint = require('express-fingerprint')
const fs = require('fs')
const stream = require('stream')
const ai = require('tictactoe-complex-ai')

const {
  PORT
} = {
  PORT: 3000,
  ...process.env
}

const aiInstance = ai.createAI({
  level: 'expert',
  minResponseTime: 500,
  maxResponseTime: 500
});

const app = express()

const games = {}

class TicTacToe {
  error = ''

  constructor() {
    this.data = Array(9).fill('')
    // this.player = Math.random() > 0.5 ? 'X' : 'O'
    // this.computer = this.player === 'X' ? 'O' : 'X'
    this.player = 'X'
    this.computer = 'O'
    if (this.player !== 'X') {
      this.aiMove()
    }
  }

  getCell(x, y) {
    return this.data[(y * 3) + x]
  }

  setCell(x, y, data) {
    this.data[(y * 3) + x] = data
  }

  getTile(x, y) {
    return this.getCell(x, y) || 'empty'
  }

  async move(x, y, player = this.player) {
    if (this.getCell(x, y)) {
      throw new Error('invalid move')
    }

    this.setCell(x, y, player)
    await this.aiMove() 
  }

  async aiMove() {
    try {
      const pos = await aiInstance.play(this.data)
      this.data[pos] = this.computer
    } catch(e) {
      console.log('err', e)
    }
  }

  toString() {
    return this.data.join(' | ')
  }
}

function createGame(id) {
  const game = new TicTacToe()
  games[id] = game
  return game
}

function getGame(id) {
  return games[id] ?? createGame(id)
}

app.use(Fingerprint({
  parameters: [
    Fingerprint.geoip,
    Fingerprint.useragent,
  ]
}))

app.use((req, res, next) => {
  const x = parseInt(req.query.x)
  const y = parseInt(req.query.y)

  if (isNaN(x) || isNaN(y)) {
    res.status(400)
    res.send('invalid x or y coordinate')
    return
  }

  req.x = x
  req.y = y
  req.game = getGame(req.fingerprint.hash)
  next()
})

app.get('/', (req, res) => {
  const { x, y, game } = req

  const tile = game.getTile(x, y)  

  const r = fs.createReadStream(`./assets/${tile}.png`) // or any other way to get a readable stream
  const ps = new stream.PassThrough() // <---- this makes a trick with stream error handling
  stream.pipeline(
   r,
   ps, // <---- this makes a trick with stream error handling
   (err) => {
    if (err) {
      console.log(err) // No such file or any other kind of error
      return res.sendStatus(400); 
    }
  })
  ps.pipe(res)
})

app.get('/move', async (req, res) => {
  const { x, y, game } = req
  try {
    await game.move(parseInt(x), parseInt(y))
  } catch(e) {}

  res.redirect('https://github.com/christianjuth')
})

app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`)
})