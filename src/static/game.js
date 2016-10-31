
let createPlayerObject = (player, stage) => {
  let image = new Image();
  image.src = "./static/img/tank1.png";
  image.onload = function(evt) {
    let tank = new createjs.Bitmap(evt.target);
    tank.x = player.x;
    tank.y = player.y;
    stage.addChild( tank );
    player.tank = tank;
    stage.update();
  }
};

let movedPlayerTo = ( player, x, y ) => {
  createjs.Tween.get(player.tank).to({x: x, y: y}, 100);
  player.x = x;
  player.y = y;
  // console.log('player', player);
};

$(document).ready( () => {
  let socket = io.connect(document.domain);
  let game = player = undefined;
  let stage = new createjs.Stage( document.getElementById("gameCanvas") );

  socket.on('connect', () => {
      sessionId = socket.io.engine.id;
      console.log('Connected ' + sessionId);
      socket.emit('joinToGame', {});
  });

  socket.on('error', (reason) => {
     console.log('Unable to connect to server', reason);
  });

  socket.on('joinedToGame', (data) => {
     console.log('Joined to game', data);
     game = data.gameData;
     player = data.player;
     console.log('game', game);

     _.forEach( game.players, (player) => {
       createPlayerObject(player, stage);
     } );
  } );

  socket.on('playerMoved', (data) => {
     let movedPlayer = _.find( game.players, { socketId: data.playerSocket } );

     if ( movedPlayer ) {
       movedPlayerTo( movedPlayer, data.playerX, data.playerY );
     }
  } );

  socket.on('playerLeft', (data) => {
     let leftPlayer = _.find( game.players, { socketId: data.playerSocket } );

     if ( leftPlayer ) {
       console.log(`Player (${leftPlayer.socketId}) left game`);
       stage.removeChild( leftPlayer.tank );
       _.remove( game.players, leftPlayer );
     }
  } );

  socket.on('newPlayer', (data) => {
    if ( !_.find( game.players, { socketId: data.player.socketId } ) ) {
      console.log(`New player(${data.player.socketId}) joined to game`);
      game.players.push( data.player );
      createPlayerObject( data.player, stage );
    }
  } );

  let tick = ()=> {
    stage.update();
  }

  createjs.Ticker.addEventListener("tick", tick);

  document.onkeydown = _.throttle( (e) => {
    switch (e.keyCode) {
        case 37:
            socket.emit('move', 'left');
            break;
        case 38:
            socket.emit('move', 'up');
            break;
        case 39:
          socket.emit('move', 'right');
            break;
        case 40:
            socket.emit('move', 'down');
            break;
    }
  }, 100 );
} );
