"use strict";

let _ = require('lodash');

const MOVE_SIZE = 10;
const ARENA_SIZE = 700;
const TANK_SIZE = 50;

/*
  0 - none
  1 - forest
  2 - bricks
  3 - wather
  4 - iron
*/
const MAP = [
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1 ],
  [ 0, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0 ],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1 ],
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


class Player {
  constructor(socket) {
    this.socket = socket;
    this.id = socket.id;
    this.hearbeatNum = 0;
    this.x = 0;
    this.y = 0;
    this.direction = 'N';
    this.name = "NAME";
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

  addPlayer( socket ) {
    if ( (this.players.length < this.MAX_PLAYERS) && !_.find( this.players, { socket: socket } ) ) {
      let player = new Player( socket );
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
        map: this.map
      }
  }

  getPlayers() {
    return this.players;
  }

  isCollision( newX, newY ) {
    console.log( 'checks for collision', newX, newY );
    let isCollision = false;

    // Checks for map objects collision
    _.forEach( this.map, ( line, y ) => {
      _.forEach( line, ( mapObj, x ) => {
        if ( !isCollision && mapObj > 1 ) {
          if ( ( newX > x * TANK_SIZE - TANK_SIZE && newX < x * TANK_SIZE + TANK_SIZE ) && ( newY > y * TANK_SIZE - TANK_SIZE && newY < y * TANK_SIZE + TANK_SIZE ) ) {
            isCollision = true;
          }
        }
      } );
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

        if ( !game.isCollision( newX, newY ) ) {
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
