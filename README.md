# CryptoDash

This is a small dashboard view to display the value of cryptocurrencies and record trading activity.  A portfolio view is displayed with position valuation.  Positions can be traded in and out, with a running total P&L displayed alongside the portfolio.

# Design

The app is single-page and uses the React framework, leveraging [Hooks](https://reactjs.org/docs/hooks-overview.html) and a single functional App component.  A local MongoDB instance is used to store currency and portfolio data.

## App structure

The app has a local API controller running on a separate Express instance, with the interface located inside a subdirectory to allow separate startup from Yarn and have the app itself be a React application.  To control this in the development environment, we use `concurrently` to start the two instances side-by-side, and `nodemon` to bring one down when the other closes.  There are several get and post functions to be leveraged by the client app.  The main folder contains only the MongoServer.js file, with client/ containing the React app itself.

## Price information

The API at [coinmarketcap](https://www.coinmarketcap.com) is used.  There are several tiers of usage - for the purposes of this app, we don't want to make repeated requests and exhaust our available credits.  On the basic plan, we are limited to 333 credits per day, which could be exhausted rapidly.  But we can curl to get a copy of the data, and use a local copy to recache into Mongo.  Using the API key provided, we can curl using the following:

`curl -H "X-CMC_PRO_API_KEY: b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c" -H "Accept: application/json" -d "start=1&limit=5000&convert=USD" -G https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest`

This retrieves a JSON file.  To provide different price data, we retrieve both from the [pro coinmarketcap](https://pro.coinmarketcap.com) and the [sandbox](https://sandbox.coinmarketcap.com/).

## Mongo structure

The Mongo database contains two collections, `cmcCache` and `portfolios`.  The cmcCache collection will be a plain copy of the .json data retrieved from coinmarketcap above.  We can load this file using MongoClient.  Using a get request with the local filename in the query string, we can load the collection with the data and use it as a cache.  We use a switch statement in the api get to allow differentiation from the other get calls we need.  Calling this url to the MongoClient port allows us to load a copy of the pro or sandbox data:

`/api/get?command=cmcCache&file=coinmarketcap.json`

The result in Mongo is a cached copy of the data:

`{
        "_id" : ObjectId("5d791fbfb9b8dc7b0b87037d"),
        "cmcCacheID" : 0,
        "data" : [
                {
                        "id" : 1,
                        "name" : "Bitcoin",
                        "symbol" : "BTC",
                        "slug" : "bitcoin",
                        "num_market_pairs" : 8033,
                        "date_added" : "2013-04-28T00:00:00.000Z",
                        "tags" : [
                                "mineable"
                        ],
                        "max_supply" : 21000000,
                        "circulating_supply" : 17933450,
                        "total_supply" : 17933450,
                        "platform" : null,
                        "cmc_rank" : 1,
                        "last_updated" : "2019-09-13T12:55:34.000Z",
                        "quote" : {
                                "USD" : {
                                        "price" : 10334.2147925,
                                        "volume_24h" : 15222299380.3475,
                                        "percent_change_1h" : 0.17975,
                                        "percent_change_24h" : 0.759396,
                                        "percent_change_7d" : -4.17236,
                                        "market_cap" : 185328124270.55914,
                                        "last_updated" : "2019-09-13T12:55:34.000Z"
                                }
                        }
                }... [more]
        ],
        "status" : {
                "timestamp" : "2019-09-13T12:56:02.775Z",
                "error_code" : 0,
                "error_message" : null,
                "elapsed" : 162,
                "credit_count" : 12
        }
}`

We also provide a cmcCall method from /api/get, which allows refresh from the live source with a call like this.  This functionality is leveraged directly from the coinmarketcap page and uses their example API key - a real key should be used to get data.

`/api/get?command=cmcCall&file=coinmarketcap.json&endpoint=pro-api.coinmarketcap.com&path=/v1/cryptocurrency/listings/latest&apikey=b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c`

### Portfolio structure

We also need a collection to store portfolio data. This should have a value for the realised profit and loss and a positions array to store ongoing trade data.  We also include IDs for user and portfolio, although at this stage we will only display a single user and portfolio.

`{
  "_id": ObjectId("5d791fbfb9b8dc7b0b87037d"),
  "userId":0,
  "friendlyName":"My User",
  "portfolioId":0,
  "positions": [
   "_id" : "5d7f54aa52fb4c085d94e162",
    "DateTime" : 1568625834179,
    "positionQty" : "0.72",
    "currencyId" : "1",
    "name" : "Bitcoin",
    "symbol" : "BTC",
    "priceAtTrade" : "9558.55163723",
    "active" : true,
    "PL" : 0
  ]
}`

## Displaying cached data

We want to present the user with a dropdown with friendly names for the currencies, and retrieve price data from the cache.  We do this with a control in the client app, and some additional get methods.  We have getTickers to get the list of currencies, and getPrice to retrieve a price per currency ID.  Example calls:

`/api/get?command=getTickers`
`/api/get?command=getPrice&tickerId=1`

At this stage, we set up a React hook by declaring both state and setter as useState.  We will always want the ticker list to be displayed to the user on page load, so we create an async function to be called on init, then use useEffect to ensure that the page load will fire it.  This is analogous to the componentDidMount function from the previous lifecycle methodology in React.

Then two helper functions, one to get a price for a currency ID, and one to generate a list of options for the dropdown.  getOptions generates the dropdown list, and getPrice leverages the same api call name in MongoServer and updates the state each time the list changes.

At this point we can load the page and see a dropdown with a currency value displayed from the cached data, and change the value to see the state updating next to the list:

![alt text](https://github.com/rob-roeburn/cryptodash/blob/master/client/public/tickerlist.png "Ticker List")

## Entering positions to a portfolios

We want the selected currency to be entered into the portfolio as a position with a quantity.  To do this we provide an input field next to the currency, and add a table view.  We leverage the functionality in [Material Tables](https://material-ui.com/components/tables/) to achieve this.  We also declare a separate portfolio state and setter to allow control independently from the ticker list.  We also provide our first post function in the MongoServer API : `/api/post?command=newPosition`.  We collect the required data, encapsulate it to JSON, and send it to the Mongo interface to be added to the portfolio collection.  The data will display using the cryptocurrency name and symbol, but uses the internal ID for storage, as these are not liable to change.

![alt text](https://github.com/rob-roeburn/cryptodash/blob/master/client/public/portfolioview.png "Portfolio View")

## Built With

* [React](https://reactjs.org/) - The web framework used
* [Yarn](https://yarnpkg.com/) - Dependency Management
* [MongoDB](https://www.mongodb.com/) - NoSQL data store

## Authors

* **Rob Young**

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
