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

    case 'cmcCall':
    const requestOptions = {
      method: 'GET',
      uri: 'https://'+req.query.endpoint+''+req.query.path,
      qs: {
        'start': '1',
        'limit': '5000',
        'convert': 'USD'
      },
      headers: {
        'X-CMC_PRO_API_KEY': req.query.apikey
      },
      json: true,
      gzip: true
    };
    rp(requestOptions).then(response => {
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
        cl.updateOne({cmcCacheID:0},{'$set': {'cmcCacheDate': new Date().getTime(), 'status':response.status, 'data':response.data}}, (err, item) => {
        })
      })
    }).catch((err) => {
      console.log(err.message);
    });
    break;

    case 'getTickers':
    mongo.connect(mongourl, { useNewUrlParser: true, useUnifiedTopology: true
    }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }
      const db = client.db('cryptodash')
      const cl = db.collection('cmcCache')
      cl.aggregate( [ { $project : { "cmcCacheDate": 1, "data.id" : 1 , "data.name" : 1 , "data.symbol" : 1, "id" : 1  } } ] ).toArray((err, output) => {
        res.send(output)
      })
    })
    break

    case 'getPrice':
    let tickerId=req.query.tickerId
    mongo.connect(mongourl, { useNewUrlParser: true, useUnifiedTopology: true
    }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }
      const db = client.db('cryptodash')
      const cl = db.collection('cmcCache')
      cl.aggregate( [ {$match: {'data.id': parseInt(tickerId)}},{$project: { data: {$filter: { input: '$data', as: 'data', cond: {$eq: ['$$data.id', parseInt(tickerId)]} }}, _id: 0 }} ] ).toArray((err, output) => {
        res.send(output)
      })
    })
    break

    default:
    console.log("Fallthrough")
  }
})

app.post('/api/post', (req, res) => {
})

app.listen(port, () => console.log(`Listening on port ${port}`))
