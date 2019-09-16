import React, { useState, useEffect }  from 'react';
import './App.css';


/**
* This is main export for the app.  Using a functional component and useEffect to access hooks.
*/

export default function App() {

  const controller = new AbortController();
  const currency = 'USD'
  const currencySymbol = '$'

  const [tState, setTState] = useState({
    tickers: [ { } ],
    tickerId: '',
    tickerName: '',
    tickerSymbol: '',
    tickerPrice: '',
  });

  /**
  * Async function to retrieve ticker list and populate to state, and get the price for the first currency to display to the user.
  */
  const loadTickers = async e => {
    let tickers = [...tState.tickers]
    let tickerlist = []
    const tickresponse = await fetch('/api/get?command=getTickers')
    const tickbody = await tickresponse.json()
    if (tickresponse.status !== 200) {
      throw Error(tickbody.message)
    }
    for ( let ticker of tickbody[0].data) {
      tickerlist.push(ticker)
    }
    tickers=tickerlist

    let tickerId = [...tState.tickerId]
    tickerId=tickbody[0].data[0].id.toString()
    let tickerSymbol = [...tState.tickerSymbol]
    tickerSymbol=tickbody[0].data[0].symbol
    let tickerName = [...tState.tickerName]
    tickerName=tickbody[0].data[0].name

    let tickerPrice = [...tState.tickerPrice]
    const priceresponse = await fetch('/api/get?command=getPrice&tickerId='+tickerId)
    const pricebody = await priceresponse.json()
    if (priceresponse.status !== 200) {
      throw Error(pricebody.message)
    } else {
      if(pricebody.length>0) {
        tickerPrice=pricebody[0].data[0].quote[currency].price.toString()
      }
      setTState({ ...tState, tickers, tickerPrice, tickerId, tickerSymbol, tickerName })
    }
  }

  const initPage = async () => {
    loadTickers()
  };

  useEffect(() => { initPage(); return () => { controller.abort(); } }, []);

  const getPrice = async e => {
    let tickerId =[...tState.tickerId]
    tickerId=e.target.value
    let tickerData = tState.tickers.find(tickerData => tickerData.id == tickerId);
    let tickerSymbol = [...tState.tickerSymbol]
    tickerSymbol = tickerData.symbol
    let tickerName = [...tState.tickerName]
    tickerName = tickerData.name

    let tickerPrice = [...tState.tickerPrice]
    const response = await fetch('/api/get?command=getPrice&tickerId='+tickerId)
    const body = await response.json()
    if (response.status !== 200) {
      throw Error(body.message)
    } else {
      if(body.length>0) {
        tickerPrice=body[0].data[0].quote[currency].price.toString()
        setTState({ ...tState, tickerId, tickerPrice,tickerName, tickerSymbol })
      }
    }
  }

  const getOptions = tState.tickers.map(
    (ticker) => <option value={ticker.id}>{ticker.name}</option>
  )

  return (
    <div>
    Select currency:<select onChange={getPrice}>{getOptions}</select>
    Price of currency ({currency}):{currencySymbol+''+tState.tickerPrice}
    </div>
  )
}
