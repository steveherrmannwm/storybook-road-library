/**
A server for Storybook Road.
@author Jeremy Dormitzer
*/

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');

var port = process.env.PORT || 8080;
var mongo_url = 'mongodb://localhost:27017/storybook_road';

app.use(express.static(path.join(__dirname, '/www')));
	
app.get('/', function (req, res) {
	res.sendFile(path.join('/index.html'));
});

io.on('connection', function(client) {
	
	client.on('create_account_teacher', function (data) {
		MongoClient.connect(mongo_url, function(err, db) {
			assert.equal(null,err);
			insert_teacher_account(db, data, function(result) {
				if (result == 0) {
					client.emit('server_error', {'message':'email_already_taken'});
				}
				else {
					client.emit('account_created');
				}
				db.close();
			});
		});
	});
	
	client.on('login', function(credentials) {
		MongoClient.connect(mongo_url, function (err,db) {
			assert.equal(null, err);
			login(db, credentials, function(result) {
				if (result == 0) {
					client.emit('server_error', {'message':'email_does_not_exist'});
				}
				else if (result == 1) {
					client.emit('server_error', {'message':'credentials_do_not_match'});
				}
				else {
					var login_info = {
						'email':result.email,
						'type':result.type
					};
					client.emit('credentials_accepted', login_info);
				}
				db.close();
			});
		});
	});
});

function login (db, credentials, callback) {
	var cursor = db.collection('storybook_road_accounts').find({'email':credentials.email});
	cursor.count(function (err, count) {
		assert.equal(null, err);
		if (count == 0) {
			callback(0);
		}
		else {
			cursor.next(function (err, result) {
				assert.equal(null,err);
				if (credentials.password == result.password) {
					callback(result);
				}
				else {
					callback(1);
				}
			});	
		}
	});
}

function insert_teacher_account(db, data, callback) {
	var cursor = db.collection('storybook_road_accounts').find({'email':data.email});
	cursor.count(function (err, count) {
		assert.equal(null, err);
		if (count > 0) {
			console.log('account already exists');
			callback(0);
		}
		else {
			db.collection('storybook_road_accounts').insertOne(data, function(err, result) {
				console.log('inserting account info');
				assert.equal(null, err);
				callback(result);
			});
		}
	});
}

server.listen(port);
