const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');


const app = express()
const port = process.env.PORT || 5000;


// const corsConfig = {
//   origin: true,
//   credentials: true,
// }
// app.use(cors(corsConfig))
// app.options('*', cors(corsConfig))



app.use(cors())
app.use(express.json())






// const uri = "mongodb+srv://loyalcars12:loyalcars12@cluster0.cpxvj.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cpxvj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        // get all parts in partsCollectin db
        const partsCollection = client.db("loyalAutoParts").collection("parts");


        // get 3 part in home page requrement-1
        app.get('/parts', async (req, res) => {
            const parts = await partsCollection.find({}).skip(3).limit(3).toArray();
            res.send(parts);
        });


        // get all members in membersCollection db
        const membersCollection = client.db("loyalAutoParts").collection("members");


        // creating access token from ACCESS_TOKEN_SECRET
        app.put('/login/:email', async (req, res) => {
            const email = req.params.email;
            console.log('email', email);
            const user = req.body;
            console.log('user', user);
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await membersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })


    } finally {

    }
}
run().catch(console.error);
















console.log(uri);


app.get('/', (req, res) => {
    res.send('Hello World! Its for LoyalCars')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})