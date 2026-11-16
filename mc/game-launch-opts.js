"use strict";

// %%%%%%%%% n3xn launch options %%%%%%%%%%%%
// Default shared-worlds relay: ayunami / Eagler Public for this client

window.eaglercraftXOpts = {
	container: "game_frame",
	worldsDB: "worlds-n3xn",
	relays: [
		{ addr: "wss://relay.shhnowisnottheti.me/", comment: "Eagler Public · shared worlds (n3xn default)", primary: true },
		{ addr: "wss://relay.deev.is/", comment: "lax1dude relay #1", primary: false },
		{ addr: "wss://relay.lax1dude.net/", comment: "lax1dude relay #2", primary: false }
	]
};

// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
