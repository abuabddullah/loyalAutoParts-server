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




// /* verify token function */
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access! 401 verifyJWT' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access! 403 verifyJWT' });
        }
        // console.log('decoded', decoded);
        req.decoded = decoded; // add decoded-key to request-object i.e. decoded={email:"asdf@jkl.asd",lat:"ajdglk",long:"klfjg"}
        next();
    })
}



async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");





        
        /* ==========>
                        parts related APIs
        <============= */


        // get all parts in partsCollectin db
        const partsCollection = client.db("loyalAutoParts").collection("parts");


        // get 3 part in home page requrement-1
        app.get('/parts', async (req, res) => {
            const parts = await partsCollection.find({}).toArray();
            res.send(parts);
        });


        // GET one part details by id
        app.get('/parts/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await partsCollection.findOne(query);
            // console.log(result);
            res.send(result)
        })


        
        // update latest available qty in parts collection
        app.patch('/parts/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const newQty = req.body.newQty;
            const update = { $set: { availableQty: newQty } };
            const result = await partsCollection.updateOne(query, update);
            // console.log(result);
            res.send(result)
        })






        /* ==========>
                        members related APIs
        <============= */


        // get all members in membersCollection db
        const membersCollection = client.db("loyalAutoParts").collection("members");


        // creating access token from ACCESS_TOKEN_SECRET
        app.put('/login/:email', async (req, res) => {
            const email = req.params.email;
            // console.log('email', email);
            const user = req.body;
            // console.log('user', user);
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await membersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        })


        // update one member details by email
        app.put('/members/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const updateUserInfo = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: updateUserInfo,
            };
            const result = await membersCollection.updateOne(filter, updateDoc, options);
            // console.log(result);
            res.send(result);
        })


        // get one member details by email
        app.get('/members/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await membersCollection.findOne(query);
            // console.log(result);
            res.send(result)
        })








        /* ==========>
                        orders related APIs
        <============= */


        // get all members in membersCollection db
        const ordersCollection = client.db("loyalAutoParts").collection("orders");


        //POST- bookings verifying "same person same day same slot same treatment available or not"
        app.post('/orders',verifyJWT, async (req, res) => {
            const orderInfo = req.body;
            const { partName, email, name } = orderInfo;
            const query = { partName, email, name }
            const exists = await ordersCollection.findOne(query);
            if (exists) {
                // console.log('exists', exists);
                const options = { upsert: true };
                const {orderQty,totalPrice}=exists;
                const updateDoc = {
                    $set: { orderQty: orderQty + orderInfo.orderQty, totalPrice: totalPrice + orderInfo.totalPrice },
                };
                const result = await ordersCollection.updateOne(query, updateDoc,options);
                // console.log('result', result);
                res.send(result);
            } else {
                const result = await ordersCollection.insertOne(orderInfo);
                // console.log('sending email 4 order');
                // sendAppointmentEmail(orderInfo);
                res.send({ result, success: 'Booking Successful' })
            }
        })


        // // GET all orders asper email with JWT
        app.get('/orders', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            // console.log('decodedEmail', decodedEmail);
            if (email === decodedEmail) {
                const query = { email };
                const cursor = await ordersCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders)
                // console.log('orders', orders);
            } else {
                return res.status(401).send({ message: 'unauthorized access! 401 verifyJWT' });
            }
        })

        
        // GET one appoinmetn details asper id
        app.get('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            // console.log(result);
            res.send(result)
        })








        /* ==========>
                        regiews related APIs
        <============= */


        // get all members in membersCollection db
        const reviewsCollection = client.db("loyalAutoParts").collection("reviews");


        //POST- reviewing by checking done or not"
        app.post('/reviews',verifyJWT, async (req, res) => {
            const reviewInfo = req.body;
            const { email } = reviewInfo;
            const query = { email }
            const exists = await reviewsCollection.findOne(query);
            if (exists) {
                res.send({ error: 'Review already exists', success: 'Review Failed', review: exists })
            } else {
                const result = await reviewsCollection.insertOne(reviewInfo);
                res.send({ result, success: 'Review Successful' })
            }
        })


        // update review by email
        app.put('/reviews/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const updateReview = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: updateReview,
            };
            const result = await reviewsCollection.updateOne(filter, updateDoc, options);
            // console.log(result);
            res.send(result);
        })


        // GET one single review by email
        app.get('/reviews/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            // console.log('email', email);
            const query = { email };
            const result = await reviewsCollection.findOne(query);
            console.log(result);
            res.send(result)
        })


        // get all reviews in home page requrement-1
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewsCollection.find({}).toArray();
            res.send(reviews);
        });


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