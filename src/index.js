const http = require('http')
const path = require('path')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirPath = path.join(__dirname, '../public')

app.use(express.static(publicDirPath))


io.on('connection', (socket) => {
    console.log('New Websocket connection')

    socket.on('join', ({ username, room }, cb) => {
        const {error, user } = addUser({ id: socket.id, username, room  })

        if (error) {
            return cb(error)
        }

        socket.join(user.room)

        socket.emit('msg', generateMessage('Admin', 'Welcome to you'))
        socket.broadcast.to(user.room).emit('msg', generateMessage(`${user.username} has joined`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        cb()
    })

    socket.on('sendMsg', (msg, cb) => {
        const user = getUser(socket.id)

        const filter = new Filter()

        if (filter.isProfane(msg)) {
            return cb('Profanity is not allowed')
        }

        io.to(user.room).emit('msg', generateMessage(user.username, msg))
        cb()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('msg', generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (position, cb) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMsg', generateLocationMessage(user.username, `https://google.com/maps?q=${position.lat},${position.long}`))
        cb()

    })
})


server.listen(port, () => {
    console.log(`server is up on port ${port}`)
})