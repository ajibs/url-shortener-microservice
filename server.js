'use strict';

// require and instantiate express
var express = require('express');
var app = express();

// require mongodb and access MongoClient
var mongo = require('mongodb').MongoClient;

// for url validation
var validUrl = require('valid-url');

// to generate short urls
var shortId = require('shortid');

var config = require('./config.js');

// database
var mLab = 'mongodb://' + config.db.host + config.db.name;
// 
// 'mongodb://localhost:27017/shorturl';


// set port
app.set('port', 5000);


// define static file paths
app.use(express.static(__dirname + '/views'));

// Home Page
app.get('/', function (req, res){
	res.sendFile('index.html');
});


// validate url, generate a short version and store in db
app.get('/new/:who(*)', function (req, res){
	// extract url
	let query = req.params.who;

	// set localhost prefix dynamically
	let local = req.get('host') + '/';


	// to store JSON responses
	let result = {};


	// connect to db
	mongo.connect(mLab, function (err, db){
		if (err){
			console.log('Unable to connect to server');
		} else {

		console.log('connected to server');
		// retrieve url collection
		let collection = db.collection('urls');

		// does url already exist
		collection.findOne( { 'original_url': query }, { 'original_url': 1, 'short_url': 1, _id: 0 }, function (err, data){
			if (data){
				// url exists; return existing data
				res.json(data);
			} else {
				// validate url
				if (validUrl.isUri(query)){
					// generate a short version 
					let shortLink = shortId.generate();
				    result.original_url = query;
				    result.short_url = local + shortLink; 
							
					// insert new link
					collection.insert(result);
				} else {
					result.error = 'Wrong url format, make sure you have a valid protocol and real site.'
				}

				res.json(result);
			}
			db.close();

		});


	}

	});

});


// re-direct 'shortened link' to 'original url'
app.get('/:code', function (req, res){
	// set localhost prefix dynamically
	let local = req.get('host') + '/';
	let code = local + req.params.code;
	
	// check if code is in database as short_url
	mongo.connect(mLab, function (err, db){
		if (err){
			console.log('Unable to connect to server');
		} else {		
			// retrieve url collection
			let collection = db.collection('urls');
			
			// find full link of code
			collection.findOne( { 'short_url': code }, { 'original_url': 1, _id: 0 }, function (err, doc){
				if (doc){
					res.redirect(doc.original_url);
				} else {
					res.end('No Link found');
				}
			});

			db.close();	
		}
		
	});

});


app.listen(app.get('port'), function (){
	console.log('Node app is running on port', app.get('port'));
});