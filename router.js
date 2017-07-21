"use strict";
const fs = require('fs');
const pug = require('pug');
const url = require('url');
const path = require('path');
const concat = require('concat-stream');
const qs = require('querystring');

function Router(){
	let rules = [];
	let request = {};
	let response = {};
	let args = {};
	let statusRules = [];
	let rootDir = '';
	let analysedRequest = {};
	this.setRule = function(method, pattern, onMatch){
		rules.push({method, pattern, onMatch});
	};
	this.getRules = function(){
		return rules;
	};
	this.setRequest = function(req){
		request = req;
	};
	this.getRequest = function(){
		return request;
	};
	this.setResponse = function(res){
		response = res;
	};
	this.getResponse = function(){
		return response;
	};
	this.setArgs = function(a){
		args = a;
	};
	this.getArgs = function(){
		return args;
	};
	this.modArgs = function(key, value){
		args[key] = value;
	};
	this.setStatusRule = function(statusCode, action){
		statusRules[statusCode] = action;
	};
	this.getStatusRules = function(){
		return statusRules;
	};
	this.setRootDir = function(path){
		rootDir = path;
	};
	this.getRootDir = function(){
		return rootDir;
	};
	this.setAnalysedRequest = function(info){
		analysedRequest = info;
	};
	this.getStatusCodeType = function(){
		return analysedRequest.response.statusCodeType;
	};
}
Router.prototype = {
	rule : function(method, pattern, onMatch) {
		this.setRule(method, pattern, onMatch);
	},
	resolve : function(request, response) {
		this.setRequest(request);
		this.setResponse(response);
		const ext = path.extname(request.url);
		if(ext === '') {
			// request for the application
			let rules = this.getRules();
			let chunks = [];
			request.on('data', chunk => chunks.push(chunk));
			request.on(
				'end', 
				() => {
					// look at the request and the user's API router rules
					// create an object with useful info about how to proceed 
					const analysedRequest = analyseRequest(request, this.getRules());
					// make this data public
					this.setAnalysedRequest(analysedRequest);
					// set status code for the response
					response.statusCode = analysedRequest.response.statusCode;
					// if request has passed all tests and can be considered a success
					if(analysedRequest.response.statusCode === 200) {
						// set the 'arguments' taken from the url pattern
						// will be available to the html template rendering engine
						this.setArgs(analysedRequest.matchedRule.args);
						if(analysedRequest.matchedRule.method === 'POST'){
							// add body data to the 'arguments'
							if(chunks.length > 0){
								let bodyData = {};
								const bodyDataString = Buffer.concat(chunks).toString();
								if(analysedRequest.body.type === 'urlencoded'){
									bodyData = qs.parse(bodyDataString);
								}
								else if(analysedRequest.body.type === 'json'){
									bodyData = JSON.parse(bodyDataString);
								}
								this.modArgs('data', bodyData);
							}
						}
						// call the matched rule's onMatch function, as defined in the user's API router rules
						analysedRequest.matchedRule.onMatch();
					}
					else {
						// send appropriate failed-request response
						let statusRules = this.getStatusRules();
						if(statusRules[response.statusCode]) {
							// if custom rule exists, call it 
							statusRules[response.statusCode]();
						}
						else {
							response.end();
						}
					}
				}
			)
		}
		else {
			// request for a file
			this.file(request.url);
		}
	},
	template : function(templatePath, customArgs = null) {
		let response = this.getResponse();
		let templateArgs = customArgs || this.getArgs();
		const ext = path.extname(templatePath);
		if(ext==='.pug'){
			const page = pug.compileFile(`${this.getRootDir()}${templatePath}`);
			response.setHeader('Content-Type', 'text/html');
			response.write(page(templateArgs));
			response.end();
		}
		else {
			throw "Only pug files currently supported";
		}
	},
	file : function(filePath) {
		const mimeType = {
			'.ico': 'image/x-icon',
			'.html': 'text/html',
			'.js': 'text/javascript',
			'.json': 'application/json',
			'.css': 'text/css',
			'.png': 'image/png',
			'.jpg': 'image/jpeg',
			'.wav': 'audio/wav',
			'.mp3': 'audio/mpeg',
			'.svg': 'image/svg+xml',
			'.pdf': 'application/pdf',
			'.doc': 'application/msword',
			'.eot': 'application/vnd.ms-fontobject',
			'.ttf': 'application/font-sfnt'
		};
		// MIME type aka content-type (in http headers)
		const ext = path.extname(filePath);
		const fileType = mimeType[ext] || false;
		const request = this.getRequest();
		const response = this.getResponse();
		if(fileType){
			fs.readFile(
				`${this.getRootDir()}${filePath}`, 
				function(error, data){
					if(error){
						response.writeHead(404, {});
					} 
					else{
						response.writeHead(200,{
							'Content-type': fileType
						});
						response.write(data);
					}
					response.end();
				}
			);
		}
		else{
			response.statusCode = 415;
			response.end();
		}
	},
	status : function(statusCode, onMatch) {
		this.setStatusRule(statusCode, onMatch);
	}
};

function analyseRequest(request, rules){
	let results = {
		response: {
			statusCode: 200,
			statusCodeType: undefined
		},
		body: {
			type: undefined
		},
		matchedRule : undefined
	};
	if(!(request.method==='POST' || request.method==='GET')){
		results.response.statusCode = 400;
		results.response.statusCodeType = 'Method';
	}
	else if(/[^A-Z|a-z|0-9|-|.|_|~|:|\/|\?|#|\[|\]|@|!|$|&|'|\(|\)|\*|\+|,|;|=|`]/.test(request.url)){
		// url has invalid characters
		results.response.statusCode = 400;
		results.response.statusCodeType = 'URL: Illegal Characters';
	}
	else if(request.method==='POST'){
		if(request.headers['content-type']){
			// currently only POST content-type (aka MIME type or media type)
			// 'application/x-www-form-urlencoded' (typically forms) and 
			// 'application/json' (typically webhooks or other API requests)
			// are supported
			if(request.headers['content-type'].indexOf('application/x-www-form-urlencoded')!==-1){
				results.body.type = 'urlencoded';
			}
			else if (request.headers['content-type'].indexOf('application/json')!==-1){
				results.body.type = 'json';
			}
			else {
				results.response.statusCode = 415;
				results.response.statusCodeType = 'Content-Type: Unsupported ';
			}
		}
		else {
			results.response.statusCode = 415;
			results.response.statusCodeType = 'Content-Type: Missing';
		}
	}
	if(results.response.statusCode === 200){
		results.matchedRule = (() => {
			let matchedRule = false;
			for(let i = 0; i < rules.length; i++){
				if(request.method === rules[i].method){
					if(rules[i].pattern==='*'){
						// if rule's pattern is for single page js client-side app
						matchedRule = rules[i];
						matchedRule.args = [];
						break;
					}
					else{
						const parsedPath = parsePathPattern(request.url, rules[i].pattern);
						if(parsedPath.match){
							matchedRule = rules[i];
							matchedRule.args = parsedPath.args;
							break;
						}
					}
				}
			}
			return matchedRule;
		})();
		if(!results.matchedRule){
			results.response.statusCode = 404;
		}
	}
	return results;
}

function parsePathPattern(urlPath, pattern){
	var parsed = {
		match : true,
		args : {}
	};
	urlPath = urlPath.replace(/\/$/, ""); // remove trailing slash
	const patternArray = pattern.split('/');
	const urlPathArray = urlPath.split('/');
	if(patternArray.length !== urlPathArray.length){
		parsed.match = false;
		return parsed;
	}
	for(let i=1; i<patternArray.length; i++){
		if(patternArray[i].charAt(0) === ':'){
			parsed.args[patternArray[i].substring(1)] = urlPathArray[i];
		}
		else{
			if(patternArray[i] !== urlPathArray[i]){
				parsed.match = false;
				break;
			}
		}
	}
	return parsed;
}

module.exports = new Router();