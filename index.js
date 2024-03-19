const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
const Users = require('./models/Users')
const bcryptjs = require('bcryptjs')

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aw2xu1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(uri)
.then(()=> console.log('connected to mongoDB'))
.catch((err)=> console.error('could not connect to mongoDB',err))

app.post('/api/register', async(req,res,next)=>{
    const {fullName, email,password} = req.body;
    if(!fullName || !email || !password){
        res.status(400).send('please fill all required fields')
    }
    else{
        const isAlreadyExist = await Users.findOne({email})
        if(isAlreadyExist){
            res.status(400).send('User already exists')
        }
        else{
            const newUser = new Users({fullName: fullName, email: email})
            bcryptjs.hash(password, 10, (err,hashedPassword)=>{
                newUser.set('password', hashedPassword)
                newUser.save()
                next()
            })
            return res.status(200).send('user registered successfully')
        }
    }
})

app.get('/', (req, res) => {
    res.send('Project is running properly')
})

app.listen(port, () => {
    console.log(`Project is running properly on port ${port}`);
})