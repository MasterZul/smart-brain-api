import express from "express"
import bcrypt from "bcrypt-nodejs"
import cors from "cors"
import knex from 'knex';
import Clarifai from 'clarifai';

//You must add your own API key here from Clarifai.
const apps = new Clarifai.App({
    apiKey: '3655251bfb8c404f85212f7e8606759b'
});

//declare express as app
const app = express()

//connect to the dataabsase
const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'smart-brain'
    }
});

// parse application/json
app.use(express.json());

//set the cors
app.use(cors())

//Port variable //example: process.env.PORT or 3001
const PORT = 3001

//listen to the port 3000
app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

//Get all the user data
app.get('/', function (req, res) {
    db.select('*').from('users')
        .then(data => {
            res.json(data);
        })
})


// API /signin ->  POST = success/fail
app.post('/signin', function (req, res) {
    const {email, password} = req.body;
    if (!email || !password) {
        return res.status(400).json("incorrect form submission for login");
    }
    db.select('email', 'hash').from('login')
        .where('email', '=', email)
        .then(data => {
            const isValid = bcrypt.compareSync(password, data[0].hash);
            if (isValid) {
                db.select('*').from('users')
                    .where('email', '=', email)
                    .then(user => {
                        res.json(user[0]);
                    })
                    .catch(err => {
                        res.status(400).json('Unable to get user')
                    })
            } else {
                res.status(400).json('wrong password or username')
            }
        }).catch(err => {
        res.status(400).json('this user not available')
    })
})
//////////////////


// // Load hash from your password DB.

//
// //////////////////


// API /register -> POST = user
app.post('/register', function (req, res) {
    const {email, password, name} = req.body;

    if (!email || !password || !name) {
        return res.status(400).json("incorrect form submission  for register");
    }

    let hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0].email,
                        name: name,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0])
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
    }).catch(err => res.status(400).json('Unable to register user'))
})

// /profile/:userId -> GET = user
app.get('/profile/:id', (req, res) => {
    const {id} = req.params;
    db.select('*').from('users').where({id})
        .then(user => {
            if (user.length) {
                res.json(user[0]);
            } else {
                res.status(400).json('Not found user');
            }
        })
        .catch(err => {
            res.status(400).json('error getting user')
        });
})

// /image --> PUT = user
app.put('/image', (req, res) => {
    const {id} = req.body;
    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then((entries) => {
            res.json(entries[0].entries);
        })
        .catch((err) => {
            res.status(400).json('Unable to get entries')
        })
})

app.post('/imageUrl', (req, res) => {
    handleApiCall(req, res);
})

const handleApiCall = (req, res) => {
    apps.models
        .predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
        .then((data) => {
            res.json(data);
        })
        .catch((err) => res.status(400).json('unable to work with api'))
}



