const express = require('express')
const bodyParser = require('body-parser')
const rp = require('request-promise');

const app = express()
const port = process.env.PORT || 3010

const mongo = require('mongodb').MongoClient
const mongourl = 'mongodb://localhost:27017'

const ObjectID = require('mongodb').ObjectID

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/api/get', (req, res) => {
})

app.post('/api/post', (req, res) => {
})

app.listen(port, () => console.log(`Listening on port ${port}`))
