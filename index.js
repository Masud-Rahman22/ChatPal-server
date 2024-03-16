const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aw2xu1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db('ChatPal').collection('users')
        const conversationCollection = client.db('ChatPal').collection('conversations')

        // register user
        app.post('/api/register', async (req, res) => {
            try {
                const userInfo = req.body;
                const result = await userCollection.insertOne(userInfo)
                res.send(result)
            } catch (error) {
                console.log(error, 'error')
            }
        })
        app.post('/api/login', async (req, res) => {
            try {
                const userInfo = req.body;
                const result = await userCollection.insertOne(userInfo)
                res.send(result)
            } catch (error) {
                console.log(error, 'error')
            }
        })

        // for conversations
        app.post('/api/conversations', async (req, res) => {
            try {
                const { senderId, receiverId } = req.body
                const newConversation = await conversationCollection.insertOne({ members: [senderId, receiverId] })
                res.send(newConversation)
            } catch (error) {
                console.log(error, 'error')
            }
        })

        app.get('/api/conversations', async (req, res) => {
            try {
                const result = await conversationCollection.find().toArray()
                res.send(result)
            } catch (error) {
                console.log(error, 'error')
            }
        })

        app.get('/api/conversations/:userId', async (req, res) => {
            try {
                const userId = req.params.userId
                const singleConversations = await conversationCollection.find({ members: { $in: [userId] } })
                console.log(singleConversations)
                const conversationUserData = singleConversations.map(async(conversation)=>{
                    const receiverId = conversation.find((member)=> member !== userId)
                    return await conversationCollection.findOne( { members : receiverId})
                }) 
                const result = await conversationCollection.findOne(conversationUserData)
                res.send(result)
            } catch (error) {
                console.log(error, 'error')
            }
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Project is running properly')
})

app.listen(port, () => {
    console.log(`Project is running properly on port ${port}`);
})