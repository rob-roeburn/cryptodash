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

    case 'getPortfolio':
    mongo.connect(mongourl, { useNewUrlParser: true, useUnifiedTopology: true
    }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }
      let portfolioId = parseInt(req.query.portfolio)
      const db = client.db('cryptodash')
      const cl = db.collection('portfolios')
      cl.find( {portfolioId : portfolioId }).toArray((err, output) => {
        res.send(output)
      })
    })
    break

    default:
    console.log("Fallthrough")
  }
})


app.post('/api/post', (req, res) => {

  switch(req.query.command) {
    case 'newPosition' :
    mongo.connect(mongourl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }
      const db = client.db('cryptodash')
      const cl = db.collection('portfolios')
      cl.find( {portfolioId : 0 }).toArray((err, output) => {
        output[0].positions.push(
          {
            _id : new ObjectID().toHexString(),
            DateTime : new Date().getTime(),
            positionQty : req.body.post[2].positionQty,
            currencyId : req.body.post[3].tickerId,
            name : req.body.post[4].tickerName,
            symbol : req.body.post[5].tickerSymbol,
            priceAtTrade : req.body.post[6].tickerPrice,
            active : true,
            PL : 0
          }
        )
        cl.updateOne({portfolioId:0},{'$set': {'positions':output[0].positions}}, (err, item) => {
        })
      })
    })
    res.send()
    break

    case 'resetPortfolio':
    mongo.connect(mongourl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }
      const db = client.db('cryptodash')
      const cl = db.collection('portfolios')
      cl.find( {portfolioId : 0 }).toArray((err, output) => {
        let newRealisedPL=0;
        cl.updateOne({portfolioId:0},{'$set': {'realisedPL':0}}, (err, item) => {})
        cl.updateOne({portfolioId:req.body.post[0].portfolioId}, {'$set': {'positions':[]}}, (err, item) => {})
      })
    })
    res.send()
    break

    case 'exitPosition':
    mongo.connect(mongourl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }
      const db = client.db('cryptodash')
      const cl = db.collection('portfolios')
      cl.find( {portfolioId : 0 }).toArray((err, output) => {
        let newRealisedPL=output[0].realisedPL+req.body.post[2].realisedPL;
        cl.updateOne({portfolioId:0},{'$set': {'realisedPL':parseFloat(newRealisedPL)}}, (err, item) => {})
        cl.updateOne({portfolioId:req.body.post[0].portfolioId, 'positions._id':req.body.post[1].positionId},{'$set': {'positions.$.active':false}}, (err, item) => {})
      })
    })
    res.send()
    break

    default:
    console.log("Fallthrough")
  }
})


app.listen(port, () => console.log(`Listening on port ${port}`))
