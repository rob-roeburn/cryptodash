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
  switch(req.query.command) {
    case 'cmcCache':
    const cmcCache=require('./client/'+req.query.file)
    mongo.connect(mongourl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }
      const db = client.db('cryptodash')
      const cl = db.collection('cmcCache')
      cl.updateOne({cmcCacheID:0},{'$set': {'status':cmcCache.status, 'data':cmcCache.data}}, (err, item) => {
      })
      res.send({"status":200})
    })
    break;

    default:
    console.log("Fallthrough")
  }
})

app.post('/api/post', (req, res) => {
})

app.listen(port, () => console.log(`Listening on port ${port}`))
