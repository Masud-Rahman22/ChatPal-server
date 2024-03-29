const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const io = require('socket.io')(8080, {
    cors: {
        origin: 'http://localhost:5173'
    }
});
require('dotenv').config();
const port = process.env.PORT || 3000;
const Users = require('./models/Users')
const bcryptjs = require('bcryptjs');
const Conversation = require('./models/conversations');
const Messages = require('./models/messages');

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aw2xu1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(uri)
    .then(() => console.log('connected to mongoDB'))
    .catch((err) => console.error('could not connect to mongoDB', err))

// socket.io
let users = [];
io.on('connection', socket => {
    console.log('user connected', socket.id)
    socket.on('addUser', id => {
        const isUserExist = users.find(user => user.id === id)
        if (!isUserExist) {
            const user = { id, socketId: socket.id }
            users.push(user)
            io.emit('getUsers', users)
        }
    })

    socket.on('sendMessage', ({ conversationId, senderId, message, receiverId }) => {
        const receiver = users.find(user => user.id === receiverId)
        const sender = users.find(user => user.id === senderId)
        if (receiver) {
            io.to(receiver.socketId).to(sender.socketId).emit('getMessage', {
                senderId,
                receiverId,
                message,
                conversationId
            })
        }
    })

    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id)
        io.emit('getUsers', users)
    })
})

app.post('/api/register', async (req, res, next) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
        res.status(400).send('please fill all required fields')
    }
    else {
        const isAlreadyExist = await Users.findOne({ email })
        if (isAlreadyExist) {
            res.status(400).send('User already exists')
        }
        else {
            const newUser = new Users({ fullName: fullName, email: email })
            bcryptjs.hash(password, 10, (err, hashedPassword) => {
                newUser.set('password', hashedPassword)
                newUser.save()
                next()
            })
            return res.status(200).send('user registered successfully')
        }
    }
})

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).send('please fill all required fields')
    }
    else {
        const user = await Users.findOne({ email })
        if (!user) {
            res.status(404).send('User email or password is incorrect')
        }
        else {
            const validatedUser = await bcryptjs.compare(password, user?.password)
            if (!validatedUser) {
                res.status(404).send('User email or password is incorrect')
            }
            else {
                return res.status(200).json({ user: { id: user._id, email: user.email, password: user.password } })
            }
        }
    }
})

app.post('/api/conversation', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const newConversation = new Conversation({ members: [senderId, receiverId] })
        await newConversation.save()
        res.status(200).send('conversation created successfully')
    } catch (error) {
        console.log(error, "error")
    }
})

app.get('/api/conversation/:id', async (req, res) => {
    try {
        const id = req.params.id
        const conversations = await Conversation.find({ members: { $in: [id] } })
        const conversationDataOfUser = Promise.all(conversations.map(async (conversation) => {
            const receiverId = conversation.members.find(member => member !== id)
            const user = await Users.findById(receiverId)
            return { user: { receiverId: user?._id, email: user?.email, fullName: user?.fullName, photo: user?.photo }, conversationId: conversation?._id }
        }))
        res.status(200).json(await conversationDataOfUser)
    } catch (error) {
        console.log(error, "error")
    }
})

app.post('/api/message', async (req, res) => {
    try {
        const { conversationId, senderId, message, receiverId = '' } = req.body;
        console.log(conversationId, senderId, message, receiverId)
        if (!senderId || !message) return res.status(404).send('please fill all required fields')
        if (conversationId === 'new' && receiverId) {
            const newConversation = new Conversation({ members: [senderId, receiverId] })
            await newConversation.save()
            const newMessage = new Messages({ conversationId: newConversation._id, senderId: senderId, message: message })
            await newMessage.save()
            return res.status(200).send('message sent successfully')
        }
        else if (!conversationId && !receiverId) {
            return res.status(404).send('please fill all required fields')
        }
        const newMessage = new Messages({ conversationId: conversationId, senderId: senderId, message: message })
        await newMessage.save()
        res.status(200).send('message sent successfully')
    } catch (error) {
        console.log(error, "error")
    }
})

app.get('/api/message/:conversationId', async (req, res) => {
    try {
        const checkMessage = async (conversationId) => {
            const messages = await Messages.find({ conversationId })
            const messageUserData = Promise.all(messages.map(async (message) => {
                const user = await Users.findById(message.senderId)
                return { user: { id: user._id, fullName: user.fullName, email: user.email }, message: message.message }
            }))
            res.status(200).json(await messageUserData)
        }
        const conversationId = req.params.conversationId
        if (conversationId === 'new') {
            const checkConversation = await Conversation.find({ members: { $all: [req.query.senderId, req.query.receiverId] } })
            if (checkConversation.length > 0) {
                checkMessage(checkConversation[0]._id)
            }
            else {
                return res.status(200).json([])
            }
        }
        else {
            checkMessage(conversationId)
        }
    } catch (error) {
        console.log(error, "error")
    }
})

app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const users = await Users.find({ _id: { $ne: userId } })
        const usersData = Promise.all(users.map(async (user) => {
            return { user: { id: user._id, fullName: user.fullName, email: user.email, photo: user.photo, userId: user._id } }
        }))
        res.status(200).json(await usersData)
    } catch (error) {
        console.log(error, "error")
    }
})

app.get('/', (req, res) => {
    res.send('Project is running properly')
})

app.listen(port, () => {
    console.log(`ChatPal a chat application on ${port}`);
})