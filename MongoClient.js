const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const rp = require('request-promise')

const app = express()
const port = process.env.PORT || 3010

const mongo = require('mongodb').MongoClient

// use mongourl to connect to local Mongo instance
const mongourl = 'mongodb://localhost:27017'
// use atlasurl to connect to Mongo instance at MongoDB Atlas cluster
const atlasurl = "mongodb+srv://roeburn_user:<pass>@roeburn-oqtkj.mongodb.net/test?retryWrites=true&w=majority";

const ObjectID = require('mongodb').ObjectID

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "access-control-allow-origin, content-type, origin, x-requested-with, accept");
  next()
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

let mongoConnection = function(req, res, mongoDatabase, mongoCollection, mongoType, mongoQuery, mongoObj) {
  mongo.connect(mongourl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }, (err, client) => {
    if (err) {
      return
    } else {
      const db = client.db(mongoDatabase)
      const cl = db.collection(mongoCollection)

      switch (mongoType) {
        case 'postNewPosition':
          cl.find( mongoQuery[0]).toArray((err, output) => {
            output[0].positions.push( mongoQuery[1] )
            cl.updateOne( mongoQuery[0], {'$set': {'positions':output[0].positions}
            }, (err, item) => {
            })
          })
          res.send()
          break
        case 'resetPortfolio':
          cl.updateOne(mongoQuery,{'$set': {'realisedPL':0}}, (err, item) => {})
          cl.updateOne(mongoQuery,{'$set': {'positions':[]}}, (err, item) => {})
          res.send()
          break
        case 'exitPosition':
          cl.find( mongoQuery[0] ).toArray((err, output) => {
            let newRealisedPL=output[0].realisedPL+mongoQuery[2]
            cl.updateOne(mongoQuery[0], {'$set': {'realisedPL':parseFloat(newRealisedPL)}}, (err, item) => {})
            cl.updateOne(mongoQuery[1],{'$set': {'positions.$.active':false}}, (err, item) => {})
          })
          res.send()
          break
        case 'updateOne':
          cl[mongoType](mongoQuery, mongoObj, (err, item) => {
          })
          break
        case 'aggregate':
        case 'find':
          cl[mongoType](mongoQuery).toArray((err, output) => {
            res.send(output)
          })
          break
        default:
        console.log("Fallthrough")
      }


    }
  })
}

app.get('/api/getCMCCache', cors(), (getCMCCacheReq, getCMCCacheRes) => {
  const cmcCache = require('./client/'+getCMCCacheReq.query.file)
  mongoConnection(
    getCMCCacheReq,
    getCMCCacheRes,
    'cryptodash',
    'cmcCache',
    'updateOne',
    {cmcCacheID:0},
    {'$set': {'status':cmcCache.status, 'data':cmcCache.data}}
  )
  getCMCCacheRes.send({"status":200})
})

app.get('/api/getCMCCall', cors(), (getCMCCallReq, getCMCCallRes) => {
  const requestOptions = {
    method: 'GET',
    uri: 'https://'+getCMCCallReq.query.endpoint+''+getCMCCallReq.query.path,
    qs: { 'start': '1', 'limit': '5000', 'convert': 'USD' },
    headers: { 'X-CMC_PRO_API_KEY': getCMCCallReq.query.apikey },
    json: true,
    gzip: true
  }
  rp(requestOptions).then(response => {
    const mongoObj = {'$set': {'cmcCacheDate': new Date().getTime(), 'status':response.status, 'data':response.data}}
    mongoConnection( getCMCCallReq, getCMCCallRes, 'cryptodash', 'cmcCache', 'updateOne', {cmcCacheID:0}, {'$set': {'cmcCacheDate': new Date().getTime(), 'status':response.status, 'data':response.data}} )
  }).catch((err) => {
    console.log(err.message)
  })
})

app.get('/api/getTickers', cors(), (getTickersReq, getTickersRes) => {
  mongoConnection(
    getTickersReq,
    getTickersRes,
    'cryptodash',
    'cmcCache',
    'aggregate',
    [ { $project : { "cmcCacheDate": 1, "data.id" : 1 , "data.name" : 1 , "data.symbol" : 1, "id" : 1 } } ]
  )
})

app.get('/api/getPrice', cors(), (getPriceReq, getPriceRes) => {
  let tickerId=getPriceReq.query.tickerId
  mongoConnection(
    getPriceReq,
    getPriceRes,
    'cryptodash',
    'cmcCache',
    'aggregate',
    [ {$match: {'data.id': parseInt(tickerId)}},{$project: { data: {$filter: { input: '$data', as: 'data', cond: {$eq: ['$$data.id', parseInt(tickerId)]} }}, _id: 0 }} ]
  )
})

app.get('/api/getPortfolio', cors(), (getPortfolioReq, getPortfolioRes) => {
  mongoConnection (
    getPortfolioReq,
    getPortfolioRes,
    'cryptodash',
    'portfolios',
    'find',
    {portfolioId : parseInt(getPortfolioReq.query.portfolio) }
  )
})

app.post('/api/postNewPosition', cors(), (postNewPositionReq, postNewPositionRes) => {
  mongoConnection (
    postNewPositionReq,
    postNewPositionRes,
    'cryptodash',
    'portfolios',
    'postNewPosition',
    [
      {portfolioId : parseInt(postNewPositionReq.body.post[0].portfolioId) },
      {
        _id : new ObjectID().toHexString(),
        DateTime : new Date(postNewPositionReq.body.post[1].tradeDate).getTime(),
        positionQty : postNewPositionReq.body.post[2].positionQty,
        currencyId : postNewPositionReq.body.post[3].tickerId,
        name : postNewPositionReq.body.post[4].tickerName,
        symbol : postNewPositionReq.body.post[5].tickerSymbol,
        priceAtTrade : postNewPositionReq.body.post[6].tickerPrice,
        active : true,
        PL : 0
      }
    ]
  )
})

app.post('/api/resetPortfolio', cors(), (resetPortfolioReq, resetPortfolioRes) => {
  mongoConnection (
    resetPortfolioReq,
    resetPortfolioRes,
    'cryptodash',
    'portfolios',
    'resetPortfolio',
    {portfolioId : parseInt(resetPortfolioReq.body.post[0].portfolioId)}
  )
})

app.post('/api/exitPosition', cors(), (exitPositionReq, exitPositionRes) => {
  mongoConnection (
    exitPositionReq,
    exitPositionRes,
    'cryptodash',
    'portfolios',
    'exitPosition',
    [
      {portfolioId : parseInt(exitPositionReq.body.post[0].portfolioId)},
      {portfolioId:exitPositionReq.body.post[0].portfolioId, 'positions._id':exitPositionReq.body.post[1].positionId},
      exitPositionReq.body.post[2].realisedPL
    ]
  )
})

app.listen(port, () => console.log(`Listening on port ${port}`))
