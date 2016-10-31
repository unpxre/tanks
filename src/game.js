"use strict";

let _ = require('lodash');

const MOVE_SIZE = 10;
const ARENA_SIZE = 700;
const TANK_SIZE = 50;

class Player {
  constructor(socket) {
    this.socket = socket;
    this.id = socket.id;
    this.hearbeatNum = 0;
    this.x = 0;
    this.y = 0;
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
        } )
      }
  }

  getPlayers() {
    return this.players;
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
        switch (data) {
          case 'left':
          if ( player.x >= MOVE_SIZE ) {
            player.x -= MOVE_SIZE;
          }
          break;
          case 'down':
            if ( player.y < ( ARENA_SIZE - TANK_SIZE ) ) {
              player.y += MOVE_SIZE;
            }
            break;
          case 'up':
            if ( player.y >= MOVE_SIZE ) {
              player.y -= MOVE_SIZE;
            }
            break;
          case 'right':
            if ( player.x < ( ARENA_SIZE - TANK_SIZE ) ) {
              player.x += MOVE_SIZE;
            }
            break;
        }

        io.emit('playerMoved', {
          playerSocket: player.socket.id,
          playerX: player.x,
          playerY: player.y
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
