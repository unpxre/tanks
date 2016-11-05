
let createPlayerObject = (player, stage) => {
  let image = new Image();
  image.src = "./static/img/tank1.png";
  image.onload = (evt) => {
    let tank = new createjs.Bitmap(evt.target);
    tank.x = player.x + 25;
    tank.y = player.y + 25;
    tank.regX = 25;
    tank.regY = 25;
    stage.addChild( tank );
    player.tank = tank;
  }
};

let createNatiObject = (nati, stage) => {
  if ( nati && stage ) {
    let image = new Image();
    image.src = "./static/img/nati.png";
    image.onload = (evt) => {
      let natiImage = new createjs.Bitmap(evt.target);
      natiImage.x = nati.x;
      natiImage.y = nati.y - 50;
      stage.addChild( natiImage );
      nati.natiImage = natiImage;
      console.log('Nati crated', nati);
    }
  }
};


let moveNatiTo = ( nati, x, y ) => {
  if ( nati && nati.natiImage ) {
    createjs.Tween.get(nati.natiImage).to({x: x, y: y - 50}, 100);
    nati.x = x;
    nati.y = y;
  }
};

let movePlayerTo = ( player, x, y, direction ) => {
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

let createBulletObject = (bullet, stage) => {
  let image = new Image();
  image.src = "./static/img/bullet.jpg";
  image.onload = (evt) => {
    let bulletCanvasObj = new createjs.Bitmap(evt.target);
    bulletCanvasObj.x = bullet.x;
    bulletCanvasObj.y = bullet.y;
    bulletCanvasObj.regX = 2;
    bulletCanvasObj.regY = 2;
    stage.addChild( bulletCanvasObj );
    bullet.bulletCanvasObj = bulletCanvasObj;
  }
};

let moveBulletTo = ( bullet, x, y ) => {
  if ( bullet.bulletCanvasObj ) {
    createjs.Tween.get(bullet.bulletCanvasObj).to( { x: x, y: y }, 100);
  }
};

let loadMapImgs = ( cb ) => {
  let forestImage = new Image();
  forestImage.src = "./static/img/forest.gif";
  forestImage.onload = (forestEvt) => {
    let brickImage = new Image();
    brickImage.src = "./static/img/brick_wall.jpg";
    brickImage.onload = (brickEvt) => {
      let watherImage = new Image();
      watherImage.src = "./static/img/wather.jpg";
      watherImage.onload = (watherEvt) => {
        let ironImage = new Image();
        ironImage.src = "./static/img/iron_wall.jpg";
        ironImage.onload = (ironEvt) => {
          cb( forestEvt.target, brickEvt.target, watherEvt.target, ironEvt.target );
        }
      }
    }
  }
};

let createMap = ( map, mapBackgroundContainer, mapForeGroundContainer ) => {
  mapBackgroundContainer.removeAllChildren();
  mapForeGroundContainer.removeAllChildren();

  loadMapImgs( ( forestImage, brickImage, wtaherImage, ironImage ) => {
    _.forEach( map, ( line, y ) => {
      _.forEach( line, ( mapObj, x ) => {
        switch ( mapObj ) {
          case 1:
            let forest = new createjs.Bitmap( forestImage );
            forest.x = 50 * x;
            forest.y = 50 * y;
            forest.name = `${x}${y}`;
            mapForeGroundContainer.addChild( forest );
            break;
          case 2:
            let brick = new createjs.Bitmap( brickImage );
            brick.x = 50 * x;
            brick.y = 50 * y;
            brick.name = `${x}${y}`;
            mapBackgroundContainer.addChild( brick );
            break;
          case 3:
            let wather = new createjs.Bitmap( wtaherImage );
            wather.x = 50 * x;
            wather.y = 50 * y;
            wather.name = `${x}${y}`;
            mapBackgroundContainer.addChild( wather );
            break;
          case 4:
            let iron = new createjs.Bitmap( ironImage );
            iron.x = 50 * x;
            iron.y = 50 * y;
            iron.name = `${x}${y}`;
            mapBackgroundContainer.addChild( iron );
            break;
        }
      } );
    } );
  } );
};

let removeBrick = ( x, y, mapBackgroundContainer) => {
  mapBackgroundContainer.removeChild( mapBackgroundContainer.getChildByName(`${x}${y}`) );
};

$(document).ready( () => {
  let socket = io.connect(document.domain);
  let game = player = nati = undefined;
  let stage = new createjs.Stage( document.getElementById("gameCanvas") );
  let playersContainer = new createjs.Container();
  let mapBackgroundContainer = new createjs.Container();
  let natiContainer = new createjs.Container();
  let bulletsContainer = new createjs.Container();
  let mapForeGroundContainer = new createjs.Container();

  stage.addChild( playersContainer );
  stage.addChild( mapBackgroundContainer );
  stage.addChild( natiContainer );
  stage.addChild( bulletsContainer );
  stage.addChild( mapForeGroundContainer );

  socket.on('connect', () => {
      sessionId = socket.io.engine.id;
      console.log('Connected ' + sessionId);
      socket.emit('joinToGame', {});
  });

  socket.on('disconnect', () => {
      alert('Game Over ;(');
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

     createMap( data.gameData.map, mapBackgroundContainer, mapForeGroundContainer);

     if ( data.gameData.nati ) {
       nati = data.gameData.nati;
       console.log('try to create Nati', nati);
       createNatiObject( nati, natiContainer );
     }

  } );

  socket.on('playerMoved', (data) => {
     let movedPlayer = _.find( game.players, { socketId: data.playerSocket } );

     if ( movedPlayer ) {
       movePlayerTo( movedPlayer, data.playerX, data.playerY, data.direction );
     }
  } );

  socket.on('natiMoved', (data) => {
     moveNatiTo( nati, data.x, data.y);
  } );

  socket.on('playerLeft', (data) => {
     let leftPlayer = _.find( game.players, { socketId: data.playerSocket } );

     console.log('data', data, player);

     if ( leftPlayer ) {
       console.log(`Player (${leftPlayer.socketId}) left game`);
       playersContainer.removeChild( leftPlayer.tank );
       _.remove( game.players, leftPlayer );

       if ( leftPlayer.socketId === player.socketId ) {
         alert( 'Game Over' );
       }
     }
  } );

  socket.on('newPlayer', (data) => {
    if ( !_.find( game.players, { socketId: data.player.socketId } ) ) {
      console.log(`New player(${data.player.socketId}) joined to game`);
      game.players.push( data.player );
      createPlayerObject( data.player, playersContainer );
    }
  } );

  socket.on('createBullet', (data) => {
    if ( !_.find( game.bullets, { playerSocketId: data.bullet.playerSocketId } ) ) {
      console.log(`New bullet fired by (${data.bullet.playerSocketId})`);
      game.bullets.push( data.bullet );
      createBulletObject( data.bullet, bulletsContainer );
    }
  } );

  socket.on('bulletMoved', (data) => {
     let movedBullet = _.find( game.bullets, { playerSocketId: data.bulletPlayerSocketId } );

     if ( movedBullet ) {
       moveBulletTo( movedBullet, data.x, data.y );
     }
  } );

  socket.on('bulletDestroyed', (data) => {
     let destoroyedBullett = _.find( game.bullets, { playerSocketId: data.bulletPlayerSocketId } );

     if ( destoroyedBullett ) {
       setTimeout( () => {
         bulletsContainer.removeChild( destoroyedBullett.bulletCanvasObj );
         _.remove( game.bullets, destoroyedBullett );
       }, 10 );
     }
  } );

  socket.on('brickDestroyed', (data) => {
     removeBrick( data.x, data.y, mapBackgroundContainer);
  } );

  socket.on('playerDestroyed', ( destroyedPlayer ) => {
     console.log(`Player (${destroyedPlayer.playerSocketId}) destroyed!`);
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
        case 70:
        case 32:
          socket.emit('fire');
          break;
    }
  }, 100 );
} );
