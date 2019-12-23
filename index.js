'use strict';

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const request = require('request-promise');
const moment = require('moment');
const screen = blessed.screen();
const grid = new contrib.grid({rows: 1, cols: 1, screen: screen});
const line = grid.set(0, 0, 1, 1, contrib.line,
    { style:
      { line: "yellow"
      , text: "green"
      , baseline: "white"}
    , xLabelPadding: 1
    , xPadding: 1,
    wholeNumbersOnly: false,
    showLegend: true,
    label: 'Bitcoin price USD - Powered by CoinDesk'})
screen.render()
let running = false;
const getPrice = async() => {
  const current = await request({uri: 'https://api.coindesk.com/v1/bpi/currentprice.json', json:true});
  const latestValue = current.bpi.USD.rate;
  const history = await request({uri:'https://api.coindesk.com/v1/bpi/historical/close.json', json:true});
  const values = history.bpi;
  values[moment().format('YYYY-MM-DD')] = Number(latestValue.replace(',',''));
  return values;
}
const formatData = (data) => {
  const resp = {
    label: 'Bitcoin price USD - Powered by CoinDesk',
    title: 'Bitcoin price USD - Powered by CoinDesk',
    x:[],
    y:[]
  };
  const sortedKeys = Object.keys(data).sort(function (a, b) {
      if (a > b) {
          return 1;
      }
      if (b > a) {
          return -1;
      }
      return 0;
  });
  sortedKeys.slice(-12).forEach(key=>{
    resp.x.push(key);
    resp.y.push(data[key]);
  });
  return resp;
}
const updatePrice = () => {
  if(running){
    return;
  }
  running = true;
  getPrice()
    .then((resp)=>formatData(resp))
    .then((formatedData) => {
        line.setData([formatedData]);
        screen.render();
        running = false;
    })
    .catch((err)=>{
      console.error('Error: ', err);
    });
}

let interval = setInterval(()=>{
  updatePrice();
},1000);
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
 clearInterval(interval);
 return process.exit(0);
});
