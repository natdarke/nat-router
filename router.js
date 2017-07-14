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
Router.prototype = {
	rule : function(method, pattern, onMatch){
		this.setRule(method, pattern, onMatch);
	},
	resolve : function(request, response){
		this.setRequest(request);
		this.setResponse(response);
		if(!(request.method==='POST' || request.method==='GET')){
			response.statusCode = 400;
			response.statusType = 'method';
			non200Response(this);
		}
		else if(!pathIsValid(request.url)){
			response.statusCode = 400;
			response.statusType = 'url';
			non200Response(this);
		}
		else {
			const ext = path.extname(request.url);
			if(ext===''){
				appRequest(request, response, this);
			}
			else {
				fileRequest(`${this.getRootDir()}${request.url}`, response, this, ext);
			}
		}
	},
	render : function(templatePath, data = {}){
		let response = this.getResponse();
		const ext = path.extname(templatePath);
		if(ext==='.pug'){
			const page = pug.compileFile(`${this.getRootDir()}${templatePath}`);
			response.setHeader('Content-Type', 'text/html');
			response.write(page(data));
			response.end();
		}
		else {
			throw "Only pug files currently supported";
		}
	},
	file : function(path){
		fileRequest(
			`${this.getRootDir()}${path}`, 
			this.getResponse(),
			this
		);
	},
	status : function(statusCode, onMatch){
		this.setStatusRule(statusCode, onMatch);
	}
};
function cleanPath(path){
	// remove trailing slash
	return path.charAt(path.length-1) === '/' ? path.slice(0, -1) : path; 
}
function pathIsValid(path){
	// tests that path has only legal URI characters
	return !(/[^A-Z|a-z|0-9|-|.|_|~|:|\/|\?|#|\[|\]|@|!|$|&|'|\(|\)|\*|\+|,|;|=|`]/.test(path));
}
function appRequest(request, response, router){
	let rules = router.getRules();
	let matchedRule = matchRule(rules, request);
	response.statusCode = 200; //default
	let chunks = [];
	request.on('data', chunk => chunks.push(chunk));
	request.on(
		'end', 
		() => {
			if(matchedRule){
				if(matchedRule.method === 'POST'){
					// if POST then add body data to the arguments passed to the 'onMatch' function 
					let contentType = getContentType(request);
					if(contentType === 'unsupported'){
						response.statusCode = 415; 
						response.statusType = 'post';
					}
					else {
						var requestBodyData = {};
						if(chunks.length > 0){
							const requestBodyDataString = Buffer.concat(chunks).toString();
							if(contentType === 'urlencoded'){
								requestBodyData = qs.parse(requestBodyDataString);
							}
							else if(contentType === 'json'){
								requestBodyData = JSON.parse(requestBodyDataString);
							}
						}
						matchedRule.args.push(requestBodyData);
					}
				}
				if(response.statusCode === 200){
					// For GET and POST (all current valid methods)
					// call the onMatch function of the matched rule
					matchedRule.onMatch.apply(this, matchedRule.args);
				}
			}
			else {
				response.statusCode = 404;
			}
			if(response.statusCode !== 200){
				non200Response(router);
			}
		}
	);
}
function matchRule(rules, request){
	let matchedRule;
	const urlPath = cleanPath(request.url);
	for(let i = 0; i < rules.length; i++){
		if(request.method === rules[i].method){
			const parsedPath = parsePath(urlPath, rules[i].pattern);
			if(parsedPath.match){
				matchedRule = rules[i];
				matchedRule.args = parsedPath.args;
				break;
			}
		}
	}
	return matchedRule;
}
function fileRequest(filePath, response, router, ext){
	ext = ext || path.extname(filePath);
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
		'.eot': 'appliaction/vnd.ms-fontobject',
		'.ttf': 'aplication/font-sfnt'
	};
	if(mimeType[ext]){
		fs.readFile(
			filePath, 
			function(error, data){
				if(error){
					response.writeHead(404, {});
				} 
				else{
					response.writeHead(200,{
						'Content-type': mimeType[ext]
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
}
function parsePath(urlPath, pattern){
	let parsed = {
		match : true,
		args : []
	};
	if(pattern==='*'){
		// for single page js apps
		// all url paths are considered a match
		// because routing to be done on the client side
		return parsed;
	}
	else{
		const patternArray = pattern.split('/');
		const urlPathArray = urlPath.split('/');
		if(patternArray.length !== urlPathArray.length){
			parsed.match = false;
			return parsed;
		}
		for(let i=1; i<patternArray.length; i++){
			if(patternArray[i].charAt(0) === ':'){
				parsed.args.push(urlPathArray[i]);
			}
			else{
				if(patternArray[i] !== urlPathArray[i]){
					parsed.match = false;
					break;
				}
			}
		}
	}
	return parsed;
}
function getContentType(request){
	// currently only POST content-type (aka MIME type or media type)
	// 'application/x-www-form-urlencoded' (typically forms) and 
	// 'application/json' (typically webhooks or other API requests)
	// are supported
	let contentType = 'unsupported';
	if(request.headers['content-type']){
		if(request.headers['content-type'].indexOf('application/x-www-form-urlencoded')!==-1){
			contentType = 'urlencoded';
		}
		else if (request.headers['content-type'].indexOf('application/json')!==-1){
			contentType = 'json';
		}
	}
	return contentType;
}
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
module.exports = new Router();