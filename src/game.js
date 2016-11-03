"use strict";

let _ = require('lodash');

const MOVE_SIZE = 10;
const ARENA_SIZE = 700;
const TANK_SIZE = 50;
const BULLET_SIZE = 5;

/*
  0 - none
  1 - forest
  2 - bricks
  3 - wather
  4 - iron
*/
const MAP = [
  [ 0, 0, 0, 0, 2, 2, 1, 1, 0, 0, 0, 1, 1, 1 ],
  [ 0, 4, 1, 0, 0, 2, 1, 0, 0, 0, 0, 1, 1, 0 ],
  [ 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0 ],
  [ 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1 ],
  [ 0, 0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 4, 4, 4 ],
  [ 0, 0, 0, 0, 1, 1, 1, 1, 3, 0, 0, 0, 0, 0 ],
  [ 0, 0, 0, 0, 1, 1, 1, 1, 3, 0, 0, 0, 0, 0 ],
  [ 0, 0, 0, 0, 0, 0, 1, 3, 3, 0, 0, 0, 0, 0 ],
  [ 0, 0, 0, 0, 0, 0, 3, 3, 1, 0, 0, 0, 0, 0 ],
  [ 0, 0, 0, 0, 0, 0, 3, 1, 1, 1, 0, 0, 0, 0 ],
  [ 0, 0, 0, 0, 0, 0, 3, 1, 1, 1, 1, 0, 0, 0 ],
  [ 0, 0, 0, 0, 0, 0, 3, 3, 2, 2, 2, 0, 0, 0 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 1, 0, 0 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 1, 1, 0 ]
];


class Bullet {
  constructor( x, y, direction, playerRef, gameRef, ioRef ) {
    switch ( direction ) {
      case 'N':
        this.x = x + TANK_SIZE/2 -2;
        this.y = y -2;
        break;
      case 'S':
        this.x = x + TANK_SIZE/2 -2;
        this.y = y + TANK_SIZE;
        break;
      case 'W':
        this.x = x;
        this.y = y + TANK_SIZE/2 -2;
        break;
      case 'E':
        this.x = x + TANK_SIZE -2;
        this.y = y + TANK_SIZE/2 -2;
        break;
    }
    this.direction = direction;
    this.playerRef = playerRef;
    this.gameRef = gameRef;
    this.ioRef = ioRef;

    this.ioRef.emit('createBullet', {
      bullet: this.getPublicBullet()
    } );
    this.moveBullet();
    this.moveInterval = setInterval(() => { this.moveBullet() }, 100);
  }

  removeBullet( wait ) {
    clearInterval( this.moveInterval );
    this.playerRef.bullet = null;
    setTimeout( () => {
      this.ioRef.emit('bulletDestroyed', {
        bulletPlayerSocketId: this.playerRef.socket.id
      } );
    }, ( wait ? 100 : 0 ) );
  }

  moveBullet() {
    if ( ( this.x < 0 || this.x > ARENA_SIZE ) || ( this.y < 0 || this.y > ARENA_SIZE ) ) {
      this.removeBullet();
    } else {
      switch ( this.direction ) {
        case 'N':
          this.y -= 20;
          break;
        case 'S':
          this.y += 20;
          break;
        case 'W':
          this.x -= 20;
          break;
        case 'E':
          this.x += 20;
          break;
      }

      let bulletDestroyed = this.gameRef.bulletMoved(this.x, this.y);
      this.ioRef.emit('bulletMoved', {
        x: this.x,
        y: this.y,
        bulletPlayerSocketId: this.playerRef.socket.id
      } );

      if ( bulletDestroyed ) {
        this.removeBullet( true );
        if ( bulletDestroyed.type === 'brick' ) {
          setTimeout( () => {
            this.ioRef.emit('brickDestroyed', {
              x: bulletDestroyed.x,
              y: bulletDestroyed.y,
            } );
          }, 100 );
        } else if ( bulletDestroyed.type === 'player' ) {
          setTimeout( () => {
            this.ioRef.emit('playerDestroyed', bulletDestroyed.player );
          }, 100 );
        }
      }
    }
  }

  getPublicBullet() {
    return {
      x: this.x,
      y: this.y,
      direction: this.direction,
      playerSocketId: this.playerRef.socket.id
    }
  }

}

class Player {
  constructor(socket, x , y) {
    this.socket = socket;
    this.id = socket.id;
    this.hearbeatNum = 0;
    this.x = x;
    this.y = y;
    this.direction = 'N';
    this.name = "NAME";
    this.bullet = null;
  }

  getPublicPlayer() {
    return {
      socketId: this.socket.id,
      hearbeatNum: this.hearbeatNum,
      x: this.x,
      y: this.y,
      name: this.name
    }
  }
}

class Game {
  constructor() {
    this.MAX_PLAYERS = 5;

    this.players = [];
    this.map = _.cloneDeep( MAP );
  }

  _checkCollision( x, y, newX, newY, size ) {
    if ( ( newX > x - size && newX < x + size ) && ( newY > y - size && newY < y + size ) ) {
      return true;
    } else {
      return false;
    }
  };

  _checkBulletCollision( objX, objY, bulletX, bulletY ) {
    if ( ( bulletX > objX - BULLET_SIZE && bulletX < objX + TANK_SIZE ) && ( bulletY > objY - BULLET_SIZE && bulletY < objY + TANK_SIZE ) ) {
      return true;
    } else {
      return false;
    }
  };

  bulletMoved( bulletX, bulletY ) {
    let bulletDestroy = null;
    // Checks for map objects collision
    _.forEach( this.map, ( line, y ) => {
      _.forEach( line, ( mapObj, x ) => {
        if ( !bulletDestroy && ( mapObj === 2 || mapObj === 4 ) ) {
          if ( this._checkBulletCollision( x * TANK_SIZE, y * TANK_SIZE, bulletX, bulletY ) ) {
            if ( mapObj === 2 )  {
              this.map[y][x] = 0;
              bulletDestroy = {
                type: 'brick',
                x: x,
                y: y
              };
            } else {
              bulletDestroy = { type: 'self' };
            }
          }
        }
      } );
    } );

    // Checks for other tank collision
    _.forEach( this.players, ( player )=> {
      if ( !bulletDestroy && this._checkBulletCollision( player.x, player.y, bulletX, bulletY ) ) {
        console.log(`Player (${player.socket.id}) was killed by bullet`);
        this.removePlayer( player.socket );
        player.socket.disconnect();
        bulletDestroy = {
          type: 'player',
          player: player.getPublicPlayer()
        };
      }
    } );


    return bulletDestroy;
  }

  addPlayer( socket ) {
    if ( (this.players.length < this.MAX_PLAYERS) && !_.find( this.players, { socket: socket } ) ) {
      let initX = 0;
      let initY = 0;
      while ( this.isCollision( initX, initY ) ) {
        initY += 50;
        if ( initY > 500 ) {
          return false;
        }
      }

      let player = new Player( socket, initX, initY );
      this.players.push( player );
      return player;
    } else {
      return false;
    }
  }

  removePlayer( socket ) {
    _.remove( this.players, { socket: socket } );
  }

  getGameData() {
      return {
        players: _.map( this.players, (player) => {
          return player.getPublicPlayer();
        } ),
        bullets: [], // TODO: send current bullets
        map: this.map
      }
  }

  getPlayers() {
    return this.players;
  }

  isCollision( newX, newY, checkingPlayer ) {
    let isCollision = false;
    // Checks for map objects collision
    _.forEach( this.map, ( line, y ) => {
      _.forEach( line, ( mapObj, x ) => {
        if ( !isCollision && mapObj > 1 ) {
          if ( this._checkCollision( x * TANK_SIZE, y * TANK_SIZE, newX, newY, TANK_SIZE ) ) {
            isCollision = true;
          }
        }
      } );
    } );

    // Checks for other tank collision
    _.forEach( this.players, ( player )=> {
      if ( ( ( checkingPlayer && checkingPlayer.id !== player.id ) || !checkingPlayer ) && this._checkCollision( player.x, player.y, newX, newY, TANK_SIZE ) ) {
        isCollision = true;
      }
    } );

    return isCollision;
  }
}

let game = new Game();

module.exports = {
  run: (io, app) => {
    // On connection
		io.on('connection', (socket)  => {
      let player = undefined;
      socket.on('joinToGame', () => {
        console.log(`New player ${socket.id} connected`);
        player = game.addPlayer( socket );
        if ( player ) {
          socket.emit( 'joinedToGame', { player: player.getPublicPlayer(), gameData: game.getGameData() } );
          io.emit('newPlayer', { player: player.getPublicPlayer() } );
        }
			} );

			socket.on('disconnect', ()  => {
				console.log(`Player ${socket.id} disconnected`);
        game.removePlayer( socket );
        io.emit('playerLeft', { playerSocket: socket.id } );
			} );

      socket.on('move', (data)  => {
        var newX = player.x;
        var newY = player.y;

        switch (data) {
          case 'left':
            if ( player.x >= MOVE_SIZE ) {
              newX -= MOVE_SIZE;
              player.direction = 'W';
            }
            break;
          case 'down':
            if ( player.y < ( ARENA_SIZE - TANK_SIZE ) ) {
              newY += MOVE_SIZE;
              player.direction = 'S';
            }
            break;
          case 'up':
            if ( player.y >= MOVE_SIZE ) {
              newY -= MOVE_SIZE;
              player.direction = 'N';
            }
            break;
          case 'right':
            if ( player.x < ( ARENA_SIZE - TANK_SIZE ) ) {
              newX += MOVE_SIZE;
              player.direction = 'E';
            }
            break;
        }

        if ( !game.isCollision( newX, newY, player ) ) {
          player.x = newX;
          player.y = newY;
        }

        io.emit('playerMoved', {
          playerSocket: player.socket.id,
          playerX: player.x,
          playerY: player.y,
          direction: player.direction
        } );
			} );

      socket.on('fire', ()  => {
        if ( !player.bullet ) {
          player.bullet = new Bullet( player.x, player.y, player.direction, player, game, io );
        }
      } );
    } );

		// Hearbeat
		setInterval( () => {
			_.forEach(game.getPlayers(), (player) => {
				++player.hearbeatNum;
				player.socket.emit( 'hearbeat', {id: player.hearbeatNum, data: 'some data'} );
			} );
		}, 3000);
  }
};
