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
		else {
			request.urlPath = cleanAndValidateUrlPath(request.url);
			if(request.urlPath){
				const ext = path.extname(request.urlPath);
				if(ext===''){
					// this is a request to the application i.e. not a file request
					let rules = this.getRules();
					let matchedRule = matchRule(rules, request);
					response.statusCode = 200; //default
					let chunks = [];
					request.on('data', chunk => chunks.push(chunk));
					request.on(
						'end', 
						() => {
							if(matchedRule){
								this.setArgs(matchedRule.args);
								if(matchedRule.method === 'POST'){
									// if POST then add body data to the arguments passed to the 'onMatch' function 
									let contentType = contentTypeIs(request);
									if(contentType === 'unsupported') {
										response.statusCode = 415; 
										response.statusType = 'post';
									}
									else {
										var bodyData = parseBodyData(chunks, contentType);
										this.modArgs('data', bodyData);
									}
								}
								if(response.statusCode === 200){
									// For GET and POST (all current valid methods)
									// call the onMatch function of the matched rule
									matchedRule.onMatch();
								}
							}
							else {
								response.statusCode = 404;
							}
							if(response.statusCode !== 200){
								non200Response(this);
							}
						}
					);
				}
				else {
					// request for a file
					this.file(request.urlPath);
				}
			}
			else {
				// path has illegal chars
				response.statusCode = 400;
				response.statusType = 'url';
				non200Response(this);
			}
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
module.exports = new Router();