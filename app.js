const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const mongoose = require('mongoose')
const session = require('express-session')

const config = require('./config')

process.on('unhandledRejection', (ex) => {
  console.log(ex.name, ex.message);
  // console.log('UNCAUGHT Rejection EXCEPTION! 💥 Shutting down...');

  // process.exit(1);
});

process.on('uncaughtException', (ex) => {
  console.log(ex);
  // console.log(ex.name, ex.message);
  // console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');

  // process.exit(1);
});
mongoose.connect(config.db, {
  useMongoClient: true,
  /* other options */

})

app.use(express.static(`${__dirname}/public`))

app.use('/libs', require('./routers/libs'))

require('./routers/tug-of-war.io')(io.of('/tug-of-war'))
app.use(
  '/tug',
  function (req, res, next) {
    res.locals.io = io.of('/tug-of-war')
    next()
  },
  require('./routers/tug-of-war')
)

app.engine('jade', require('jade').__express)
app.set('view engine', 'jade')

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true
}))

app.use('/', require('./routers/tuku'))
app.use('/tuku', require('./routers/tuku'))
app.use('/login', require('./routers/login'))

app.use(function (req, res, next) {
  res.sendStatus(404)
})

app.use(require('./middlewares/errorhandler'))
// app.on('')
http.listen(config.port)
