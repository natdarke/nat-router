"use strict";

// To Do
//  Add error handling for malformed data in post request body

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
	let callback = null;
	let args = {};
	let bodyData = {};
	let statusRules = [];
	let rootDir = '';
	let analysedRequest = {};
	this.setRule = function(method, pattern, onMatch){
		rules.push({method, pattern, onMatch});
	};
	this.getRules = function(){
		return rules;
	};
	this.setRequest = function(o){
		request = o;
	};
	this.getRequest = function(){
		return request;
	};
	this.setResponse = function(o){
		response = o;
	};
	this.getResponse = function(){
		return response;
	};
	this.setCallback = function(fn){
		callback = fn;
	};
	this.getCallback = function(){
		return callback;
	};
	this.setArgs = function(o){
		args = o;
	};
	this.getArgs = function(){
		return args;
	};
	this.setBodyData = function(o){
		bodyData = o;
	};
	this.getBodyData = function(){
		return bodyData;
	};
	this.setStatusRule = function(n, fn){
		statusRules[n] = fn;
	};
	this.getStatusRules = function(){
		return statusRules;
	};
	this.setRootDir = function(str){
		rootDir = str;
	};
	this.getRootDir = function(){
		return rootDir;
	};
	this.setAnalysedRequest = function(o){
		analysedRequest = o;
	};
	this.getAnalysedRequest = function(){
		return analysedRequest;
	};
	this.getStatusCodeType = function(){
		return analysedRequest.response.statusCodeType;
	};
}
Router.prototype = {
	rule : function(method, pattern, onMatch) {
		this.setRule(method, pattern, onMatch);
	},
	resolve : function(request, response, synchronousDelay = false) {
		this.setRequest(request);
		this.setResponse(response);
		const ext = path.extname(request.url);
		if(ext === '') {
			// if this is an application request
			const analysedRequest = analyseRequest(request, this.getRules());
			this.setAnalysedRequest(analysedRequest);
			response.statusCode = analysedRequest.response.statusCode;
			if(analysedRequest.response.statusCode===200){
				// if the request is successful i.e. is valid and a matching rule was found
				const analysedRequest = this.getAnalysedRequest();
				this.setArgs(analysedRequest.matchedRule.args);
				if(analysedRequest.matchedRule.method === 'POST'){
					// The body of POST requests can be data of any size and type (MIME type)
					// Node breaks the data down into 'chunks' (often just a single chunk)
					// Chunks are stored as arrays of binary data. 
					// 'Buffer' provides a way dealing with chunks
						// In this case, converting into a string
					// The server relies on the request emitting events:
						// 'data' when a chunk is received
						// 'end' after the last chunk is received
					let chunks = [];
					request.on('data', chunk => chunks.push(chunk));
					request.on('end', () => {
						let bodyData = {};
						if(chunks.length > 0) {	
							const bodyDataString = Buffer.concat(chunks).toString();
							if(analysedRequest.body.type === 'urlencoded') {
								bodyData = qs.parse(bodyDataString);
							}
							else if(analysedRequest.body.type === 'json') {
								bodyData = JSON.parse(bodyDataString);
							}
						}
						this.setBodyData(bodyData);
						// call the function declared in the router rule 
						analysedRequest.matchedRule.onMatch(this.getArgs(), bodyData);
					});
				}
				else if(analysedRequest.matchedRule.method === 'GET'){
					// call the function declared in the router rule 
					analysedRequest.matchedRule.onMatch(this.getArgs());
				}
				else {
					throw "Request has not been analysed properly. Only POST and GET currently suppoerted. See function analyseRequest().";
				}
			}
			else {
				// else it is a failed request (non 200 response code)
				let statusRules = this.getStatusRules();
				if(statusRules[response.statusCode]) {
					// failed requests can have a custom HTML template 
					// e.g. custom template for a 404 
					// if a rule for a custom HTML template exists (for this statusCode), call it 
					statusRules[response.statusCode]();
				}
				else {
					response.end();
				}
			}
		}
		else {
			// else this is a request for a file
			this.file(request.url);
		}
	},
	template : function(templatePath, customArgs = null) {
		let response = this.getResponse();
		let templateArgs = customArgs || this.getArgs();
		const ext = path.extname(templatePath);
		if (ext === '.pug'){
			const fullTemplatePath = `${this.getRootDir()}${templatePath}`;
			fs.access(
				fullTemplatePath,
				(error) => {
					if (error) {
						if (error.code === 'ENOENT') {
							throw `${fullTemplatePath} does not exist`;
						}
						throw error;
					}
				}
			);
			const page = pug.compileFile(fullTemplatePath);
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
	// This function has a look at the request and returns useful info about it:
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
		results.response.statusCodeType = 'Method: Unsupported';
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
				results.response.statusCodeType = 'Content-Type: Unsupported';
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