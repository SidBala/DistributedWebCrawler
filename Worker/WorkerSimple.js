#!/usr/bin/env node

var log = require('log-colors');
var beanstalk = require('fivebeans');
var Promise = require('bluebird');
var os = require('os');
var util = require('util');

var config = 
	{
		// Master that runs beanstalkd
		'MasterIP' : '54.183.156.239',
		'MasterPort' : 443,
		
		// # of instances to spin up for each CPU core on the machine
		'ProcMult' : 2,

		// # of instances to cap out on this machine
		'MaxProc' : 10
	};

// Number of Cores on this machine
var numCPUs = os.cpus().length;

// These are the number of PhantomJS instances we will spin up on this worker
var numInstances = Math.min(numCPUs * config.ProcMult, config.MaxProc);
log.debug('Using instances:' + numInstances);

// We are going to fire up some beanstalkd clients - one for each phantomjs instance
var clientPromises = [];

// Let's connect all our worker instances asynchronously to the master beanstalkd instance
for(var i = 0; i < numInstances ; i++) {
	clientPromises.push(new Promise(function(res, rej) {
		var client = new beanstalk.client(config.MasterIP, config.MasterPort);
		client
		.on('connect', function() {
			client.watch('WorkLocal', function(err, numWatched) {

				if(err) return log.error(err);
				//log.debug('WorkTube watched');

				res(client);
			});
		})
		.on('error', function(err) {
			rej(err)
		}).connect();
	}));
}

var numWorking = 0;

// Specify what work we want to do in this kernel
function kernel(jobID, payload, client, clientIdx) {
	return new Promise(function(res, rej) {
		var startTime = Date.now();
		numWorking++;
		setTimeout(function(){
			client.destroy(jobID, function(err) {
				if(err) {
					log.error('Error destroying Job: ' + jobID + '; Error: ' + err);
					res();
				}

				var endTime = Date.now();

				log.debug('Worker#: ' + clientIdx  + ' | Done with:  ' + jobID + ' | Took: ' + (endTime - startTime).toString() + 'ms');

				numWorking--;

				if(numWorking <= 0) {
					numWorking = 0;
					log.info('All workers idle');
				}

				res();
			});
		},Math.random() * 1000);
	});
}

// Now start listening for jobs and kick off the kernel when we get jobs
Promise.all(clientPromises).then(function(clients) {
	clients.forEach(function(client, clientIdx) {

		function reserveAndDispatchJob(client, clientIdx) {
			client.reserve(function(err, jobID, payload){
				if(err) return log.error(err);
				
				log.debug('Worker#: ' + clientIdx  + ' | Working on: ' + jobID + ' | Payload: ' + payload);
				kernel(jobID, payload, client, clientIdx).then(function() {
					setImmediate(function() {
						reserveAndDispatchJob(client, clientIdx);	
					});
				});
			});
		}
		reserveAndDispatchJob(client, clientIdx);
	});
});
