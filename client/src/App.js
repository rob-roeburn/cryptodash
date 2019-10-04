import React, { forwardRef, useState, useEffect }  from 'react'
import MaterialTable from 'material-table'
import AddBox from '@material-ui/icons/AddBox'
import ArrowUpward from '@material-ui/icons/ArrowUpward'
import Check from '@material-ui/icons/Check'
import ChevronLeft from '@material-ui/icons/ChevronLeft'
import ChevronRight from '@material-ui/icons/ChevronRight'
import Clear from '@material-ui/icons/Clear'
import DeleteOutline from '@material-ui/icons/DeleteOutline'
import Edit from '@material-ui/icons/Edit'
import FilterList from '@material-ui/icons/FilterList'
import FirstPage from '@material-ui/icons/FirstPage'
import LastPage from '@material-ui/icons/LastPage'
import Remove from '@material-ui/icons/Remove'
import SaveAlt from '@material-ui/icons/SaveAlt'
import Search from '@material-ui/icons/Search'
import ViewColumn from '@material-ui/icons/ViewColumn'
import Button from '@material-ui/core/Button'

import './App.css'

/**
* This is main export for the app.  Using a functional component and useEffect to access hooks.
*/

export default function App() {

  const controller = new AbortController()

  // leave dbServer blank to default to send API calls to same endpoint as site
  //const dbServer = ""
  // Set dbServer to specific port on localhost
  //const dbServer = "http://localhost:3010"
  // Set dbServer to AWS docker image
  //const dbServer = "http://localhost:49160"
  // Set dbServer to location of deployed Node application
  const dbServer = "https://3299ece3ccc74205b96d7e7881b7bb1e.vfs.cloud9.eu-west-1.amazonaws.com"

  const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }

  const tableIcons = {
    Add: forwardRef((props, ref) => <AddBox {...props} ref={ref} />),
    Check: forwardRef((props, ref) => <Check {...props} ref={ref} />),
    Clear: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
    Delete: forwardRef((props, ref) => <DeleteOutline {...props} ref={ref} />),
    DetailPanel: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
    Edit: forwardRef((props, ref) => <Edit {...props} ref={ref} />),
    Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref} />),
    Filter: forwardRef((props, ref) => <FilterList {...props} ref={ref} />),
    FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
    LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
    NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
    PreviousPage: forwardRef((props, ref) => <ChevronLeft {...props} ref={ref} />),
    ResetSearch: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
    Search: forwardRef((props, ref) => <Search {...props} ref={ref} />),
    SortArrow: forwardRef((props, ref) => <ArrowUpward {...props} ref={ref} />),
    ThirdStateCheck: forwardRef((props, ref) => <Remove {...props} ref={ref} />),
    ViewColumn: forwardRef((props, ref) => <ViewColumn {...props} ref={ref} />)
  }

  const currency = 'USD'

  const [erState, setERState] = useState({
    exchangeRates: [ {'rateName': 'USD', 'rate': 1, 'symbol': '$'} , {'rateName' :'GBP', 'rate': 0.89, 'symbol': '£' } ],
    selectedExchangeRate: [ {'rateName': 'USD', 'rate': 1, 'symbol': '$'} ]
  })

  const [tState, setTState] = useState({
    tickers: [ { } ],
    tickerId: '',
    tickerName: '',
    tickerSymbol: '',
    tickerPrice: '',
  })

  const [pState, setPState] = useState({
    portfoliocolumns: [ { title: 'Trade time', field: 'tradetime' },{ title: 'Name', field: 'name' },{ title: 'Symbol', field: 'symbol' },{ title: 'Position', field: 'position' },{ title: 'Price at trade ('+erState.selectedExchangeRate[0].symbol+')', field: 'tradePrice' },{ title: 'Active', field: 'active' },{ title: 'Unrealised P&L  ('+erState.selectedExchangeRate[0].symbol+')', field: 'pl' } ],
    positionData: [ { } ],
    precision: 2,
    portfolioId: 0,
    portfolioUnrealisedPL: 0,
    portfolioRealisedPL: 0,
  })

  /**
  * Async function to retrieve ticker list and populate to state, and get the price for the first currency to display to the user.
  */
  const loadTickers = async e => {
    let tickers = [...tState.tickers]
    let tickerlist = []
    const tickresponse = await fetch(dbServer+'/api/getTickers?table=cmcCache')
    const tickbody = await tickresponse.json()
    if (tickresponse.status !== 200) {
      throw Error(tickbody.message)
    }
    for (let ticker of tickbody) {
      tickerlist.push(ticker)
    }
    tickers=tickerlist
    let tickerId = [...tState.tickerId]
    tickerId=tickbody[0].tickerId.toString()
    let tickerSymbol = [...tState.tickerSymbol]
    tickerSymbol = tickbody[0].tickerSymbol
    let tickerName = [...tState.tickerName]
    tickerName = tickbody[0].tickerName

    let tickerPrice = [...tState.tickerPrice.toString()]
    const priceresponse = await fetch(dbServer+'/api/getPrice?table=cmcCache&tickerId='+tickerId)
    const pricebody = await priceresponse.json()
    if (priceresponse.status !== 200) {
      throw Error(pricebody.message)
    } else {
      tickerPrice = pricebody.Items[0].cmcCacheData.quote[currency].price.toString()
      setTState({ ...tState, tickers, tickerPrice, tickerId, tickerSymbol, tickerName })
    }
  }

  /**
  * Async function to retrieve portfolio list and populate to state, and calculate P&L on the fly for live positions.
  */
  const refreshPortfolio = async e => {
    let positionData = [...pState.positionData]
    // convert stored integers to strings to remain iterable
    let portfolioUnrealisedPL = [...pState.portfolioUnrealisedPL.toString()]
    let portfolioRealisedPL = [...pState.portfolioRealisedPL.toString()]
    positionData = []
    let unrealisedPL = 0
    const response = await fetch(dbServer+'/api/getPortfolio?table=portfolios&portfolioId='+pState.portfolioId)
    const body = await response.json()
    if (response.status !== 200) {
      throw Error(body.message)
    } else {
      let newData = []
      for ( let position of body.Items[0].positions) {
        let tickerPrice,positionPL = 0
        const priceresponse = await fetch(dbServer+'/api/getPrice?table=cmcCache&tickerId='+position.currencyId)
        const pricebody = await priceresponse.json()
        if (priceresponse.status !== 200) {
          throw Error(pricebody.message)
        } else {
          tickerPrice=pricebody.Items[0].cmcCacheData.quote[currency].price.toString()
          // Only aggregate P&L for active positions
          if(position.active) {
            // Calculate P&L - current price - price at trade * position qty
            unrealisedPL = unrealisedPL+(tickerPrice-position.priceAtTrade)*position.positionQty
            positionPL = (tickerPrice-position.priceAtTrade)*position.positionQty
          }
          // Push each position up to the newData array
          newData.push({
            id: position._id,
            portfolioId: body.Items[0].portfolioId,
            tradetime: new Date(position.DateTime).toLocaleTimeString("en-GB" , dateOptions ),
            currencyId: position.currencyId,
            name: position.name,
            symbol: position.symbol,
            position: position.positionQty,
            tradePrice: (position.priceAtTrade*erState.selectedExchangeRate[0].rate),
            active: position.active.toString(),
            pl:(positionPL*erState.selectedExchangeRate[0].rate).toFixed(pState.precision)
          })
        }
      }
      // Set newData into positionData state for setting
      positionData = newData
      portfolioUnrealisedPL = unrealisedPL
      portfolioRealisedPL = body.Items[0].realisedPL
      setPState({ ...pState, positionData, portfolioUnrealisedPL, portfolioRealisedPL})
    }
  }

  const initPage = async () => {
    loadTickers()
    refreshPortfolio()
  }

  useEffect(() => {
    initPage()
    return () => { controller.abort() } }, []
  )

  const searchObject = function(obj, match, field) {
    let results = []
    for(let i = 0; i<obj.length; i++) {
      if(obj[i][field]==parseInt(match)) {
        results.push(obj[i])
      }
    }
    return results
  }

  /**
  * Async function to retrieve price data for a ticker defined by the CMC ID.
  */
  const getPrice = async e => {
    let tickerId = [...tState.tickerId]
    tickerId = e.target.value
    let tickerData = searchObject(tState.tickers,tickerId,"tickerId")
    let tickerSymbol = [...tState.tickerSymbol]
    tickerSymbol = tickerData[0].tickerSymbol
    let tickerName = [...tState.tickerName]
    tickerName = tickerData[0].tickerName
    let tickerPrice = [...tState.tickerPrice.toString()]
    const response = await fetch(dbServer+'/api/getPrice?table=cmcCache&tickerId='+tickerId)
    const body = await response.json()
    if (response.status !== 200) {
      throw Error(body.message)
    } else {
      tickerPrice = (body.Items[0].cmcCacheData.quote[currency].price)
      setTState({ ...tState, tickerId, tickerPrice,tickerName, tickerSymbol })
    }
  }

  /**
  * Async function to enter trade data using the selected currency and input position data.
  */
  const enterTrade = async e => {
    if (window.confirm ("Are you sure?")) {
      let postData = []
      postData.push({"portfolioId": pState.portfolioId})
      postData.push({"tradeDate": new Date()})
      postData.push({"positionQty":document.getElementById("positionQty").value})
      postData.push({"tickerId":tState.tickerId})
      postData.push({"tickerName":tState.tickerName})
      postData.push({"tickerSymbol":tState.tickerSymbol})
      postData.push({"tickerPrice":tState.tickerPrice})

      const response = await fetch(dbServer+'/api/postNewPosition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post: postData }),
      })
      const body = await response
      if (response.status !== 200) {
        throw Error(body.message)
      } else {
        refreshPortfolio()
      }
    }
  }

  /**
  * Async function to reset the cache file in the database based on the button value.
  */
  const updateCacheFile = async e => {
    //    const response = await fetch(dbServer+'/api/get?command=cmcCache&file='+e.target.textContent)
    const response = await fetch(dbServer+'/api/getCMCCache?file='+e.target.textContent)
    const body = await response.json()
    if (response.status !== 200) {
      throw Error(body.message)
    } else {
      loadTickers()
      let tickers = []
      setTState({...tState, tickers})
      refreshPortfolio()
    }
  }

  /**
  * Async function to reset the portfolio view in the database completely.
  */
  const resetPortfolio = async e => {
    if (window.confirm ("Are you sure?")) {
      let postData = []
      postData.push({"portfolioId": pState.portfolioId})
      const response = await fetch(dbServer+'/api/resetPortfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post: postData }),
      })
      const body = await response
      if (response.status !== 200) {
        throw Error(body.message)
      } else {
        setTimeout(() => {
          refreshPortfolio()
        }, 250)
      }
    }
  }

  const getOptions = tState.tickers.map(
    (ticker) => <option value={ticker.tickerId}>{ticker.tickerName}</option>
  )

  const getExchangeRates = erState.exchangeRates.map(
    (exchangeRate) => <option value={exchangeRate.rateName}>{exchangeRate.rateName}</option>
  )

  const updateExchangeRate = (e) =>  {
    let selectedExchangeRate = [...erState.selectedExchangeRate]
    let exchangeRate = erState.exchangeRates.find(exchangeRateData => exchangeRateData.rateName == e.target.value)
    selectedExchangeRate = []
    selectedExchangeRate.push(exchangeRate)
    setERState({ ...erState, selectedExchangeRate })
  }

  return (
    <div>
    {/* Headlines */}
    <div className="outerDiv">
    <div className="leftDiv"><h2>CryptoDash</h2></div>
    <div className="midDiv"><h4>Unrealised P&L Total: {erState.selectedExchangeRate[0].symbol+''+(pState.portfolioUnrealisedPL*erState.selectedExchangeRate[0].rate).toFixed(pState.precision)}</h4></div>
    <div className="rightDiv"><h4>Realised P&L Total: {erState.selectedExchangeRate[0].symbol+''+(pState.portfolioRealisedPL*erState.selectedExchangeRate[0].rate).toFixed(pState.precision)}</h4></div>
    </div>

    {/* Portfolio view table */}
    <MaterialTable
    title='Portfolio View'
    icons={tableIcons}
    columns={pState.portfoliocolumns}
    data={pState.positionData}
    editable={{
      onRowDelete: oldData =>
      new Promise(resolve => {
        if(oldData.active === 'true') {
          setTimeout(() => {
            fetch(dbServer+'/api/getPrice?table=cmcCache&tickerId='+oldData.currencyId, { } )
            .then(function(response) {
              return response.json()
            })
            .then(function(currentPriceRes) {
              let postData = []
              postData.push({"portfolioId": oldData.portfolioId})
              postData.push({"table": "portfolios"})
              postData.push({"positionId": oldData.id})
              postData.push({"realisedPL": (currentPriceRes.Items[0].cmcCacheData.quote.USD.price-oldData.tradePrice)*oldData.position})
              fetch(dbServer+'/api/exitPosition', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Methods': '*',
                  'Access-Control-Allow-Credentials': 'true',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                body: JSON.stringify({ post: postData }),
              }).then(function(response) {
                refreshPortfolio()
                resolve()
              })
            })
          }, 250)
        } else {
          alert("You cannot exit a closed position.")
          resolve()
        }
      }),
    }}
    />

    {/* Trade entry and system control */}
    <table>
    <tbody>
    <tr><td><h3>Trade Entry</h3></td></tr>
    <tr><td>Select currency</td><td><select onChange={getPrice}>{getOptions}</select></td></tr>
    <tr><td>Price of currency</td><td id='tickerPrice'>{erState.selectedExchangeRate[0].symbol+''+(tState.tickerPrice*erState.selectedExchangeRate[0].rate) }</td></tr>
    <tr><td>Position quantity</td><td><input id='positionQty' type='text' /></td></tr>
    <tr><td></td><td><Button variant="contained" color="primary" onClick={enterTrade}>Trade</Button></td></tr>
    <tr><td><h3>System Control</h3></td></tr>
    <tr><td>Reload cache from sandbox</td><td><Button variant="contained" color="primary" onClick={updateCacheFile}>coinmarketcap.json</Button></td></tr>
    <tr><td>Reload cache from pro</td><td><Button variant="contained" color="primary" onClick={updateCacheFile}>pro.coinmarketcap.json</Button></td></tr>
    <tr><td>Reset portfolio</td><td><Button variant="contained" color="primary" onClick={resetPortfolio}>Zero positions</Button></td></tr>
    <tr><td>Currency to view (USD={erState.selectedExchangeRate[0].rate})</td><td><select onChange={updateExchangeRate}>{getExchangeRates}</select></td></tr>
    </tbody>
    </table>

    </div>
  )
}
