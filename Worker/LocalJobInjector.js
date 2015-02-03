var log = require('log-colors');
var beanstalk = require('fivebeans');
var Promise = require('bluebird');
var os = require('os');
var util = require('util');

var Hash = require ('hashids');
var hash = new Hash('Thiz iz mah salt');

var numJobs = process.argv[2] || 1;

log.debug('# of Jobs to inject: ' +  numJobs);

var config = 
	{
		// Master that runs beanstalkd
		'MasterIP' : 'localhost',
		'MasterPort' : 443,
		
		// # of instances to spin up for each CPU core on the machine
		'ProcMult' : 2,

		// # of instances to cap out on this machine
		'MaxProc' : 10
	};

new Promise(function(res, rej) {
	var client = new beanstalk.client(config.MasterIP, config.MasterPort);
	client
	.on('connect', function() {
		client.use('WorkLocal', function(err, numWatched) {

			if(err) return log.error(err);

			res(client);
		});
	})
	.on('error', function(err) {
		rej(err)
	}).connect();
}).then(function(client) {
	log.debug('Connected to Beanstalkd on localhost');

	//Put some  jobs in the tubes
	for(var i=0; i < numJobs; i++) {
		
		// Generate some random payloads.
		// These payloads will be strings.
		var aPayload = hash.encode(parseInt(Math.random() * 10));

		// Put the job into the tube
		client.put(
			 0, 	  // Priority
		   0,   	// Delay. 0 = start immediately
	     120, 	// Timeout. 2 minutes.
		   '', 	  // empty payload
		function(err, jobID) {
			  if(err) return log.error(err);
			  log.debug('InjectedJobID: ' + jobID );
		});
	}

	setTimeout(process.exit, 1000);
});
