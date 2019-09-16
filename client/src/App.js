import React, { forwardRef, useState, useEffect }  from 'react';
import MaterialTable from 'material-table';
import AddBox from '@material-ui/icons/AddBox';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import Check from '@material-ui/icons/Check';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import Clear from '@material-ui/icons/Clear';
import DeleteOutline from '@material-ui/icons/DeleteOutline';
import Edit from '@material-ui/icons/Edit';
import FilterList from '@material-ui/icons/FilterList';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Remove from '@material-ui/icons/Remove';
import SaveAlt from '@material-ui/icons/SaveAlt';
import Search from '@material-ui/icons/Search';
import ViewColumn from '@material-ui/icons/ViewColumn';
import Button from '@material-ui/core/Button';

import './App.css';


/**
* This is main export for the app.  Using a functional component and useEffect to access hooks.
*/

export default function App() {

  const controller = new AbortController();

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
  };

  const currency = 'USD'
  const currencySymbol = '$'

  const [tState, setTState] = useState({
    tickers: [ { } ],
    tickerId: '',
    tickerName: '',
    tickerSymbol: '',
    tickerPrice: '',
  });

  const [pState, setPState] = useState({
    portfoliocolumns: [ { title: 'Trade time', field: 'tradetime' },{ title: 'Name', field: 'name' },{ title: 'Symbol', field: 'symbol' },{ title: 'Position', field: 'position' },{ title: 'Price at trade ('+currencySymbol+')', field: 'tradePrice' },{ title: 'Active', field: 'active' },{ title: 'Unrealised P&L  ('+currencySymbol+')', field: 'pl' } ],
    positionData: [ { } ],
    precision: 2,
    portfolioId: 0,
    portfolioUnrealisedPL: 0,
    portfolioRealisedPL: 0,
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

  /**
  * Async function to retrieve portfolio list and populate to state, and calculate P&L on the fly for live positions.
  */
  const refreshPortfolio = async e => {
    let positionData = [...pState.positionData]
    // convert stored integers to strings to remain iterable
    let portfolioUnrealisedPL = [...pState.portfolioUnrealisedPL.toString()]
    let portfolioRealisedPL = [...pState.portfolioRealisedPL.toString()]
    positionData=[]
    let unrealisedPL=0
    const response = await fetch('/api/get?command=getPortfolio&portfolio='+pState.portfolioId)
    const body = await response.json()
    if (response.status !== 200) {
      throw Error(body.message)
    } else {
      let newData=[]
      for ( let position of body[0].positions) {
        let tickerPrice,positionPL=0;
        const priceresponse = await fetch('/api/get?command=getPrice&tickerId='+position.currencyId)
        const pricebody = await priceresponse.json()
        if (priceresponse.status !== 200) {
          throw Error(pricebody.message)
        } else {
          if(pricebody.length>0) {
            tickerPrice=pricebody[0].data[0].quote[currency].price.toString()
          }
          // Only aggregate P&L for active positions
          if(position.active) {
            // Calculate P&L - current price - price at trade * position qty
            unrealisedPL=unrealisedPL+(tickerPrice-position.priceAtTrade)*position.positionQty
            // Round for display
            positionPL=Math.round((((tickerPrice-position.priceAtTrade)*position.positionQty) + 0.00001) * 100) / 100
          }
          // Push each position up to the newData array
          newData.push({
            id: position._id,
            portfolioId: body[0].portfolioId,
            tradetime: new Date(position.DateTime).toLocaleTimeString("en-GB" , dateOptions ),
            currencyId: position.currencyId,
            name: position.name,
            symbol: position.symbol,
            position: position.positionQty,
            tradePrice: position.priceAtTrade,
            active: position.active.toString(),
            pl:positionPL.toString()
          })
        }
      }
      // Set newData into positionData state for setting
      positionData=newData
      // Round for display
      let roundedUnrealisedPL = Math.round((unrealisedPL + 0.00001) * 100) / 100
      let roundedRealisedPL = Math.round((body[0].realisedPL + 0.00001) * 100) / 100;
      portfolioUnrealisedPL=roundedUnrealisedPL.toFixed(pState.precision).toString()
      portfolioRealisedPL=roundedRealisedPL.toFixed(pState.precision).toString()
      setPState({ ...pState, positionData, portfolioUnrealisedPL, portfolioRealisedPL})
    }
  }

  const initPage = async () => {
    loadTickers()
    refreshPortfolio()
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

      const response = await fetch('/api/post?command=newPosition', {
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

  const getOptions = tState.tickers.map(
    (ticker) => <option value={ticker.id}>{ticker.name}</option>
  )

  return (
    <div>
    {/* Portfolio view table */}
    <MaterialTable
    title='Portfolio View'
    icons={tableIcons}
    columns={pState.portfoliocolumns}
    data={pState.positionData}
    />

    Select currency:<select onChange={getPrice}>{getOptions}</select>
    Price of currency ({currency}):{currencySymbol+''+tState.tickerPrice}
    Position quantity<input id='positionQty' type='text' />
    <Button variant="contained" color="primary" onClick={enterTrade}>Trade</Button>
    </div>
  )
}
