/*
 * Handles the brunt of the post-related websocket calls
 */

var $ = require('jquery'),
	common = require('../common'),
	main = require('./main'),
	posts = require('./posts/'),
	state = require('./state');

// The actual object of handler functions for websocket calls
var dispatcher = main.dispatcher;

dispatcher[common.INSERT_POST] = function(msg) {
	// FIXME: msg[0] is legacy. Could use a fix after we shift in the new client
	var msg = msg[1];
	const isThread = !msg.op;
	if (isThread)
		main.syncs[msg.num] = 1;
	msg.editting = true;

	// TODO: Check, if post is mine
	var el;

	var view = new posts[isThread ? 'Section' : 'Article']({
		// Create model
		model: new posts[isThread ? 'ThreadModel' : 'PostModel'](msg),
		id: msg.num,
		el: el
	});
};

// Move thread to the archive board
dispatcher[common.MOVE_THREAD] = function(msg) {
	var msg = msg[0],
		model = new posts.ThreadModel(msg);
	new posts.Section({
		model: model,
		id: msg.num
	});
};

dispatcher[common.INSERT_IMAGE] = function(msg) {
	var model = posts.posts.get(msg[0]);

	// TODO: Check for postform

	if (model)
		model.set('image', msg[1]);
};

dispatcher[common.UPDATE_POST] = function(msg, op) {
	const num = msg[0],
		links = msg[4],
		extra = msg[5],
		state = [msg[2] || 0, msg[3] || 0];
	var model = posts.posts.get(num);

	// TODO: Add backlinks

	if (model) {
		model.set({
			body: model.get('body') + msg[1],
			state: state
		});
	}

	// TODO: Check for own post

	// TODO: Make this prettier
	var bq = $('#' + num + ' > blockquote');
	if (bq.length) {
		oneeSama.dice = extra && extra.dice;
		oneeSama.links = links || {};
		oneeSama.callback = inject;
		oneeSama.buffer = bq;
		oneeSama.state = state;
		oneeSama.fragment(msg[1]);
	}
};

dispatcher[common.FINISH_POST] = function(msg) {
	const num = msg[0];

	// TODO: Ownpost handling

	var model = posts.posts.get(num);
	if (model)
		model.set('editing', false);
};

dispatcher[common.DELETE_POSTS] = function(msg) {
	msg.forEach(function(num) {
		var model = posts.posts.get(num)
		if (model)
			model.destroy();

		// TODO: Free up post fucus, if any
	});
};

dispatcher[common.DELETE_THREAD] = function(msg, op) {
	delete main.syncs[op];

	// TODO: Ownposts & postForm

	var model = posts.threads.get(op);
	if (model)
		model.destroy();
};

dispatcher[common.LOCK_THREAD] = function(msg, op) {
	var model = posts.threads.get(op);
	if (model)
		model.set('locked', true);
};

dispatcher[common.UNLOCK_THREAD] = function(msg, op) {
	var model = posts.threads.get(op);
	if (model)
		model.set('locked', false);
};

dispatcher[common.DELETE_IMAGES] = function(msg) {
	msg.forEach(function(num) {
		var model = posts.posts.get(num);
		if (model)
			model.unset('image');
	});
};

dispatcher[common.SPOILER_IMAGES] = function(msg, op) {
	msg.forEach(function(info) {
		var model = posts.posts.get(info[0]);
		if (model)
			model.trigger('spoiler',info[1]);
	});
};

dispatcher[common.SYNCHRONIZE] = main.connSM.feeder('sync');
dispatcher[common.INVALID] = main.connSM.feeder('invalid');

dispatcher[common.ONLINE_COUNT] = function(msg){
	$('#onlineCount').text('['+msg[0]+']');
};

// Sync settings to server
dispatcher[common.HOT_INJECTION] = function(msg){
	// Request new varibles, if hashes don't match
	if (msg[0] == false && msg[1] != window.configHash)
		send([common.HOT_INJECTION, true]);
	// Update variables and hash
	else if (msg[0] == true){
		window.configHash = msg[1];
		/*
		 * XXX: We can probably just use the window object properties for most
		 * of these. Time will tell, what can be discarded.
		 */
		state.config.set(msg[2][0]);
		state.imagerConfig.set(msg[2][1]);
		state.reportConfig.set(msg[2][2]);
		state.hotConfig.set(msg[2][3]);
	}
};

/*
 * TODO: These are used only for the Admin panel. Would be nice, if we could
 * set those in admin/client.js. Would need to export main.js outside the bundle
 * then.
 */
dispatcher[common.MODEL_SET] = function (msg, op) {};
dispatcher[common.COLLECTION_RESET] = function (msg, op) {};
dispatcher[common.COLLECTION_ADD] = function (msg, op) {};