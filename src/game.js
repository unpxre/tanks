"use strict";

let _ 	= require('lodash');

let players = [];

class Player {
  constructor(socket) {
    this.socket = socket;
    this.id = socket.id;
    this.hearbeatNum = 0;
  }

  getPublicPlayer() {
    return {
      socketId: this.socket.id,
      hearbeatNum: this.hearbeatNum
    }
  }
}

module.exports = {
  run: (io, app) => {
    console.log('run');

    // On connection
		io.on('connection', (socket)  => {

      socket.on('joinToGame', () => {
        console.log(`New player ${socket.id} entered`);
        if ( players.length < 5 ) {
          let player = new Player( socket );
          players.push( player );
          socket.emit( 'joinedToGame', { player: player.getPublicPlayer(), someGameData: 'blabla' } );
        }
			} );

			socket.on('disconnect', ()  => {
				console.log(`Player ${socket.id} disconnected`);
			} );
    } );

		// Hearbeat
		setInterval( () => {
			_.forEach(players, (player) => {
				++player.hearbeatNum;
				player.socket.emit( 'hearbeat', {id: player.hearbeatNum, data: 'some data'} );
			} );
		}, 3000);
  }
};
