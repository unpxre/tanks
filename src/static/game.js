
let createPlayerObject = (player, stage) => {
  let image = new Image();
  image.src = "./static/img/tank1.png";
  image.onload = function(evt) {
    let tank = new createjs.Bitmap(evt.target);
    tank.x = player.x + 25;
    tank.y = player.y + 25;
    tank.regX = 25;
    tank.regY = 25;
    stage.addChild( tank );
    player.tank = tank;
  }
};

let movedPlayerTo = ( player, x, y, direction ) => {
  let rotation = 0;
  switch( direction ) {
    case 'S':
      rotation = 180;
      break;
    case 'W':
      rotation = 270;
      break;
    case 'E':
      rotation = 90;
      break;
  }

  createjs.Tween.get(player.tank).to({x: x + 25, y: y + 25, rotation: rotation}, 100);

  player.x = x;
  player.y = y;
  player.direction = direction;
};


let loadMapImgs = ( cb ) => {
  let forestImage = new Image();
  forestImage.src = "./static/img/forest.gif";
  forestImage.onload = function(forestEvt) {
    let brickImage = new Image();
    brickImage.src = "./static/img/brick_wall.jpg";
    brickImage.onload = function(brickEvt) {
      let watherImage = new Image();
      watherImage.src = "./static/img/wather.jpg";
      watherImage.onload = function(watherEvt) {
        let ironImage = new Image();
        ironImage.src = "./static/img/iron_wall.jpg";
        ironImage.onload = function(ironEvt) {
          cb( forestEvt.target, brickEvt.target, watherEvt.target, ironEvt.target );
        }
      }
    }
  }
};

let createMap = ( map, stage ) => {
  loadMapImgs( ( forestImage, brickImage, wtaherImage, ironImage ) => {
    _.forEach( map, ( line, y ) => {
      _.forEach( line, ( mapObj, x ) => {
        switch ( mapObj ) {
          case 1:
            let forest = new createjs.Bitmap( forestImage );
            forest.x = 50 * x;
            forest.y = 50 * y;
            stage.addChild( forest );
            break;
          case 2:
            let brick = new createjs.Bitmap( brickImage );
            brick.x = 50 * x;
            brick.y = 50 * y;
            stage.addChild( brick );
            break;
          case 3:
            let wather = new createjs.Bitmap( wtaherImage );
            wather.x = 50 * x;
            wather.y = 50 * y;
            stage.addChild( wather );
            break;
          case 4:
            let iron = new createjs.Bitmap( ironImage );
            iron.x = 50 * x;
            iron.y = 50 * y;
            stage.addChild( iron );
            break;
        }
      } );
    } );
  } );
};

$(document).ready( () => {
  let socket = io.connect(document.domain);
  let game = player = undefined;
  let stage = new createjs.Stage( document.getElementById("gameCanvas") );
  let playersContainer = new createjs.Container();
  let mapContainer = new createjs.Container();

  stage.addChild(playersContainer);
  stage.addChild(mapContainer);

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

     _.forEach( game.players, (player) => {
       createPlayerObject( player, playersContainer );
     } );

     createMap( data.gameData.map, mapContainer);

  } );

  socket.on('playerMoved', (data) => {
     let movedPlayer = _.find( game.players, { socketId: data.playerSocket } );

     if ( movedPlayer ) {
       movedPlayerTo( movedPlayer, data.playerX, data.playerY, data.direction );
     }
  } );

  socket.on('playerLeft', (data) => {
     let leftPlayer = _.find( game.players, { socketId: data.playerSocket } );

     if ( leftPlayer ) {
       console.log(`Player (${leftPlayer.socketId}) left game`);
       playersContainer.removeChild( leftPlayer.tank );
       _.remove( game.players, leftPlayer );
     }
  } );

  socket.on('newPlayer', (data) => {
    if ( !_.find( game.players, { socketId: data.player.socketId } ) ) {
      console.log(`New player(${data.player.socketId}) joined to game`);
      game.players.push( data.player );
      createPlayerObject( data.player, playersContainer );
    }
  } );

  let tick = ()=> {
    stage.update();
  }

  createjs.Ticker.addEventListener("tick", tick);

  document.onkeydown = _.throttle( (e) => {
    switch (e.keyCode) {
        case 37:
        case 65:
            socket.emit('move', 'left');
            break;
        case 38:
        case 87:
            socket.emit('move', 'up');
            break;
        case 39:
        case 68:
          socket.emit('move', 'right');
            break;
        case 40:
        case 83:
            socket.emit('move', 'down');
            break;
    }
  }, 100 );
} );
