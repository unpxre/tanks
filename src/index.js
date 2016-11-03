"use strict";

let express = require("express");
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let haml = require('hamljs');
let fs = require('fs');
let game = require('./game');

app.set('port', (process.env.PORT || 80));

app.use('/static', express.static('src/static'));

app.get('/', (req, res) => {
  let hamlView = fs.readFileSync( './src/views/index.haml', 'utf8' );
    res.end( haml.render(hamlView, { locals: { key: 'value' } }) );
} );

game.run( io, app );

http.listen(app.get('port'), () => {
  console.log('listening on *:80');
} );
