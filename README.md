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

## Built With

* [React](https://reactjs.org/) - The web framework used
* [Yarn](https://yarnpkg.com/) - Dependency Management
* [MongoDB](https://www.mongodb.com/) - NoSQL data store

## Authors

* **Rob Young**

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
