'use strict';

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const request = require('request-promise');
const moment = require('moment');
const screen = blessed.screen();
const grid = new contrib.grid({rows: 2, cols: 1, screen});
const line = grid.set(0, 0, 1, 1, contrib.line,
    {style:
      {line: 'yellow',
          text: 'green',
          baseline: 'white'},
    xLabelPadding: 1,
    xPadding: 1,
    wholeNumbersOnly: false,
    showLegend: true,
    label: 'Bitcoin price USD - Powered by Coincap'});
const othersLine = grid.set(1, 0, 1, 1, contrib.line,
    {style:
      {line: 'yellow',
          text: 'green',
          baseline: 'white'},
    xLabelPadding: 1,
    xPadding: 1,
    wholeNumbersOnly: false,
    showLegend: true,
    label: 'Crypto price'});
screen.render();
let running = false;
function randomColor() {
    return [Math.random() * 255, Math.random() * 255, Math.random() * 255];
}
const formatData = (coin, data) => {
    const resp = {
        title: coin,
        x:[],
        y:[],
        style:{
            line: randomColor()
        }
    };
    const sortedData = data.sort(function(a, b) {
        if (a.time > b.time) {
            return 1;
        }
        if (b.time > a.time) {
            return -1;
        }
        return 0;
    });
    sortedData.forEach((elm) => {
        resp.x.push(moment(elm.time).format('MM-DD'));
        resp.y.push(Number(elm.priceUsd));
    });
    return resp;
};
const getPrice = async(coin) => {
    const now = moment().unix() * 1000;
    const startTime = moment().subtract(2, 'month').unix() * 1000;
    const baseUrl = `https://api.coincap.io/v2/assets/${coin}`;
    const url = `${baseUrl}/history?interval=d1&start=${startTime}&end=${now}`;
    const history = await request({uri:url, json:true});
    const response = [...history.data];
    const current = await request({uri:baseUrl, json:true});
    response.push({time: now, priceUsd: current.data.priceUsd});
    return formatData(coin, response);
};

const updatePrice = () => {
    if(running) {
        return;
    }
    running = true;
    getPrice('bitcoin')
        .then((formatedData) => {
            line.setData(formatedData);
            return Promise.all([getPrice('ethereum'), getPrice('monero')]);
        })
        .then((formatedData) => {
            othersLine.setData(formatedData);
            screen.render();
            running = false;
        })
        .catch((err) => {
            running = false;
            console.error('Error: ', err);
        });
};
updatePrice();
let interval = setInterval(() => {
    updatePrice();
}, 1000 * 60);

screen.key(['escape', 'q', 'C-c'], function() {
    clearInterval(interval);
    return process.exit(0);
});

screen.on('resize', () => {
    line.emit('attach');
    othersLine.emit('attach');
});
