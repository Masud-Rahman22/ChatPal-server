const mongoose = require('mongoose')

const conversationsSchema = mongoose.Schema({
    members: {
        type: Array,
        required: true,
    }
})

const Conversation = new mongoose.model('Conversation', conversationsSchema)
module.exports = Conversation;