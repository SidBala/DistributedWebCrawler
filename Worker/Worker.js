#!/usr/bin/env node

var log = require('log-colors');
var beanstalk = require('fivebeans');
var Promise = require('bluebird');
var os = require('os');

var config = 
	{
		// Master that runs beanstalkd
		'MasterIP' : <MasterIpHere>,
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

// We are going to fire up some beanstalkd clients - one for each phantomjs instance
var beanstalkClients = [];

