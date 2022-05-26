const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")('sk_test_51L0mz8C4IDVrgcznjJes3WtKlOiKFEsk4RIPj6neZjAiwDvfEqm6EOUSFqUscErRekE7QevGEKBaLK5UBz0iJe0i00XOCONFhE');
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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





        // verify admin or not 
        const verifyAdmin = async (req, res, next) => {
            const requesterEmail = req.decoded.email;
            const requesterDetails = await membersCollection.findOne({ email: requesterEmail });
            if (requesterDetails.role === 'admin') {
                next();
            } else {
                return res.status(401).send({ message: 'unauthorized access! 401 verifyIsAdmin' });
            }
        }



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



        // update latest available qty in parts collection after order placed
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
                        parts+admin related APIs
        <============= */



        // update  partInfo in parts collection 
        app.put('/manageProducts/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const partInfo = req.body;
            console.log(partInfo);
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const update = { $set: partInfo };
            const result = await partsCollection.updateOne(query, update, options);
            console.log(result);
            res.send(result)
        })


        // post a new part in parts collection
        app.post('/addProducts', verifyJWT, verifyAdmin, async (req, res) => {
            const partInfo = req.body;
            console.log(partInfo);
            const result = await partsCollection.insertOne(partInfo);
            // console.log(result);
            res.send(result)
        })


        // delete a part from parts collection
        app.delete('/deleteProducts/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await partsCollection.deleteOne(query);
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
                        members+admin related APIs
        <============= */


        // get to know user is admin or not
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await membersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            console.log(isAdmin);
            res.send({ admin: isAdmin })
        })


        // get all members
        app.get('/members', verifyJWT, verifyAdmin, async (req, res) => {
            const members = await membersCollection.find().toArray();
            res.send(members);
        })


        // empower an user as admin  by whom already in admin role
        app.put('/admin/:email', verifyJWT, async (req, res) => {
            const proposedEmail4Admin = req.params.email;
            const decodedEmail = req.decoded.email;
            const requesterEmail = decodedEmail;

            const requesterDetails = await membersCollection.findOne({ email: requesterEmail });


            if (requesterDetails.role === 'admin') {
                const filter = { email: proposedEmail4Admin };
                const update = { $set: { role: 'admin' } };
                const result = await membersCollection.updateOne(filter, update);
                res.send({ result, success: 'Admin role added' })
            } else {
                res.status(403).send({ error: 'forbidden authority' });
            }
        })








        /* ==========>
                        orders related APIs
        <============= */


        // get all members in membersCollection db
        const ordersCollection = client.db("loyalAutoParts").collection("orders");


        // //POST- bookings verifying "same person same day same slot same treatment available or not"
        // app.post('/orders', verifyJWT, async (req, res) => {
        //     const orderInfo = req.body;
        //     const { partName, email, name } = orderInfo;
        //     const query = { partName, email, name }
        //     const exists = await ordersCollection.findOne(query);
        //     if (exists) {
        //         res.send({ error: 'orders already exists', success: 'orders Failed', orders: exists })
        //     } else {
        //         const result = await ordersCollection.insertOne(orderInfo);
        //         // console.log('sending email 4 order');
        //         // sendAppointmentEmail(orderInfo);
        //         res.send({ result, success: 'orders Successful' })
        //     }
        // })


        //POST- bookings verifying "same person same day same slot same treatment available or not"
        app.post('/orders', verifyJWT, async (req, res) => {
            const orderInfo = req.body;
            const result = await ordersCollection.insertOne(orderInfo);
            // console.log('sending email 4 order');
            // sendAppointmentEmail(orderInfo);
            res.send({ result, success: 'orders Successful' })
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
                        ORDERS+ADMIN related APIs
        <============= */


        //get all order of all members
        app.get('/allOrders', verifyJWT, verifyAdmin, async (req, res) => {
            const orders = await ordersCollection.find().toArray();
            // console.log(orders);
            res.send(orders);
        })


        //get all order of all members
        app.delete('/allOrders/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            console.log('id', id);
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            // console.log(result);
            res.send(result);
        })


        // saving paymetn info in db
        app.patch('/allOrders/:id', verifyJWT,verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    shipped: true,
                }
            }
            const updatedShipping = await ordersCollection.updateOne(filter, updatedDoc);
            // console.log('sending email 4 payment');
            // sendPaymentConfirmationEmail(nee param );
            res.send(updatedShipping);
        })








        /* ==========>
                        regiews related APIs
        <============= */


        // get all members in membersCollection db
        const reviewsCollection = client.db("loyalAutoParts").collection("reviews");


        //POST- reviewing by checking done or not"
        app.post('/reviews', verifyJWT, async (req, res) => {
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



        /* ==========>
                        PAYMENT related APIs
        <============= */


        // get all members in membersCollection db
        const paymentsCollection = client.db("loyalAutoParts").collection("payments");


        // payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const totalPrice = req.body.totalPrice;

            const amount = totalPrice * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });


        // saving paymetn info in db
        app.patch('/payment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                }
            }

            const result = await paymentsCollection.insertOne(payment);
            const updatedBooking = await ordersCollection.updateOne(filter, updatedDoc);
            // console.log('sending email 4 payment');
            // sendPaymentConfirmationEmail(nee param );
            res.send(updatedBooking);
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