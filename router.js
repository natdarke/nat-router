"use strict";
const fs = require('fs');
const pug = require('pug');
const url = require('url');
const path = require('path');
const concat = require('concat-stream');
const qs = require('querystring');
const contentTypeIs = require('./content-type-is.js');
const parseBodyData = require('./parse-body-data.js');
const fileTypeIs = require('./file-type-is.js');
const matchRule = require('./match-rule.js');
const parsePathPattern = require('./parse-path-pattern.js');
const cleanAndValidateUrlPath = require('./clean-and-validate-url-path.js');

function Router(){
	let rules = [];
	let request = {};
	let response = {};
	let args = {};
	let statusRules = [];
	let rootDir = '';
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
}

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
		results.response.statusType = 'method';
	}
	else if(/[^A-Z|a-z|0-9|-|.|_|~|:|\/|\?|#|\[|\]|@|!|$|&|'|\(|\)|\*|\+|,|;|=|`]/.test(request.url)){
		// url has invalid characters
		results.response.statusCode = 400;
		results.response.statusType = 'url';
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
				results.response.statusType = 'unsupported-content-type';
			}
		}
		else {
			results.response.statusCode = 415;
			results.response.statusType = 'missing-content-type';
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
Router.prototype = {
	rule : function(method, pattern, onMatch){
		this.setRule(method, pattern, onMatch);
	},
	resolve : function(request, response){
		this.setRequest(request);
		this.setResponse(response);
		const ext = path.extname(request.url);
		if(ext===''){
			// request for the application
			// to do : clean path
			let rules = this.getRules();
			let chunks = [];
			request.on('data', chunk => chunks.push(chunk));
			request.on(
				'end', 
				() => {
					// look at the request and the user-generated router rules
					// create an object with useful info about how to proceed 
					const analysedRequest = analyseRequest(request, this.getRules());
					response.statusCode = analysedRequest.response.statusCode;
					// if request has passed all tests and can be considered a success
					if(analysedRequest.response.statusCode === 200){
						// set the 'arguments' taken from the url pattern
						// will be available to the html template rendering engine
						this.setArgs(analysedRequest.matchedRule.args);
						if(analysedRequest.matchedRule.method === 'POST'){
							// add body data to the 'arguments'
							var bodyData = parseBodyData(chunks, analysedRequest.body.type);
							this.modArgs('data', bodyData);
						}
						// call the matched rule's onMatch function, as defined using the API rule method
						analysedRequest.matchedRule.onMatch();
					}
					else{
						// send appropriate failed-request response
						let statusRules = this.getStatusRules();
						if(statusRules[response.statusCode]){
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
			this.file(request.urlPath);
		}
	},
	render : function(templatePath, customArgs = null){
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
	file : function(filePath){
		const ext = path.extname(filePath);
		const fileType = fileTypeIs(ext);
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
			response.statusType = 'file';
			non200Response(router);
		}
	},
	status : function(statusCode, onMatch){
		this.setStatusRule(statusCode, onMatch);
	}
};

function non200Response(router){
	let response = router.getResponse();
	let statusRules = router.getStatusRules();
	if(statusRules[response.statusCode]){
		statusRules[response.statusCode]();
	}
	else {
		response.end();
	}
}
function failedRequest(router){
	let response = router.getResponse();
	let statusRules = router.getStatusRules();
	if(statusRules[response.statusCode]){
		statusRules[response.statusCode]();
	}
	else {
		response.end();
	}
}

module.exports = new Router();