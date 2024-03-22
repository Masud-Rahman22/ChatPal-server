const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
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
                res.status(200).send('User is logged in successfully')
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
            return { user: { email: user?.email, fullName: user?.fullName }, conversationId: conversation?._id }
        }))
        res.status(200).json(await conversationDataOfUser)
    } catch (error) {
        console.log(error, "error")
    }
})

app.post('/api/message', async (req, res) => {
    try {
        const { conversationId, senderId, message } = req.body;
        const newMessage = new Messages({ conversationId: conversationId, senderId: senderId, message: message })
        await newMessage.save()
        res.status(200).send('message sent successfully')
    } catch (error) {
        console.log(error, "error")
    }
})

app.get('/api/message/:conversationId', async(req,res)=>{
    try {
        const conversationId = req.params.conversationId
        const messages = await Messages.find({conversationId})
        const messageUserData = Promise.all(messages.map(async(message)=>{
            const user = await Users.findById(message.senderId)
            return {user: {fullName: user.fullName, email: user.email}, message: message.message}
        }))
        res.status(200).json(await messageUserData)
    } catch (error) {
        console.log(error, "error")
    }
})

app.get('/api/users', async(req,res)=>{
    try {
        const users = await Users.find()
        const usersData = Promise.all(users.map(async(user)=>{
            return {user: {fullName: user.fullName, email: user.email}, userId: user._id}
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
    console.log(`Project is running properly on port ${port}`);
})