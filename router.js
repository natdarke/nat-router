"use strict";
const fs = require('fs');
const pug = require('pug');
const url = require('url');
const path = require('path');
const concat = require('concat-stream');
const qs = require('querystring');

function Router(){
	let routes = [];
	let request = {};
	let response = {};
	this.setRoute = function(method, pattern, handler){
		routes.push({method, pattern, handler});
	};
	this.getRoutes = function(){
		return routes;
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
}
Router.prototype = {
	on : function(method, pattern, handler){
		this.setRoute(method, pattern, handler);
	},
	resolve : function(request, response){
		if(!pathIsValid(request.url)){
			response.writeHead(400,'Invalid Request');
			response.end('Invalid Request');
			return false;
		}
		this.setRequest(request);
		this.setResponse(response);
		const ext = path.extname(request.url);
		if(ext!==''){
			fileRequest(request, response, ext);
		}
		else {
			appRequest(request, response, this);
		}
	},
	render : function(templatePath, data){
		let response = this.getResponse();
		const ext = path.extname(templatePath);
		if(ext==='.pug'){
			const page = pug.compileFile(templatePath);
			response.writeHead(200,{'Content-Type': 'text/html'});
			response.end(page(data), 'utf-8');
		}
		else if(ext==='.html'){
			//single page js app
			fs.readFile(
				templatePath, 
				function(error, data){
					if(error){
						throw `File ${templatePath} doesn't exist`;
					}
					else{
						response.writeHead(200,{'Content-Type': 'text/html'});
						response.end(data, 'utf-8');
					}
				}
			);
		}
		else {
			throw "Only pug and html files currently supported";
		}
	}
};
function cleanPath(path){
	// remove trailing slash
	return path.charAt(path.length-1) === '/' ? path.slice(0, -1) : path; 
}
function pathIsValid(path){
	return !(/[^A-Z|a-z|0-9|-|.|_|~|:|\/|\?|#|\[|\]|@|!|$|&|'|\(|\)|\*|\+|,|;|=|`]/.test(path));
}
function appRequest(request, response, router){
	const urlPath = cleanPath(request.url);
	let routes = router.getRoutes();
	var route;
	let args = [];
	for(let i=0; i<routes.length; i++){
		if(request.method===routes[i].method){
			const parsedPath = parsePath(urlPath, routes[i].pattern);
			if(parsedPath.match){
				route = routes[i];
				args = parsedPath.args;
				break;
			}
		}
	}
	if(route){
		if(route.method==='POST'){
			let chunks = [];
			request.on('data', chunk => chunks.push(chunk));
			if(request.headers['content-type'].indexOf('application/x-www-form-urlencoded')!==-1){
				request.on(
					'end', 
					() => {
						args.push(
							qs.parse(
								Buffer.concat(chunks).toString()
							)
						);
						route.handler.apply(this, args);
					}
				);
			}
			else if(request.headers['content-type'].indexOf('application/json')!==-1){
				request.on(
					'end', 
					() => {
						const chunksArray = Buffer.concat(chunks);
						const chunksStr = chunks.toString();
						const jsonData = JSON.parse(chunksStr);
						args.push(jsonData);
						route.handler.apply(this, args);
					}
				);
			}
			else{
				response.statusCode = 415;
				response.end('Unsupported Media Type');
			}
		}
		else if(route.method==='GET') {
			route.handler.apply(this, args);
		}
		else {
			throw('Only GET and POST methods currently supported');
		}
	}
	else{
		response.writeHead(404,'Page Not found');
		response.end('Page Not Found');
	}
}
function parsePath(path, pattern){
	let parsed = {
		match : true,
		args : []
	};
	const patternArray = pattern.split('/');
	const pathArray = path.split('/');
	if(patternArray.length !== pathArray.length){
		parsed.match = false;
		return parsed;
	}
	for(let i=1; i<patternArray.length; i++){
		if(patternArray[i].charAt(0) === ':'){
			parsed.args.push(pathArray[i]);
		}
		else{
			if(patternArray[i] !== pathArray[i]){
				parsed.match = false;
				break;
			}
		}
	}
	return parsed;
}
function fileRequest(request, response, ext){	
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
		const filePath = `${__dirname}${request.url}`;
		fs.readFile(
			filePath, 
			function(error, data){
				if(error){
					response.writeHead(404,'File Not found');
					response.end();
				} 
				else{
					response.statusCode = 200;
					response.setHeader('Content-type', mimeType[ext] || 'text/plain' );
					response.end(data, 'binary');
				}
			}
		);
	}
	else{
		response.statusCode = 415;
		response.end('Unsupported Media Type');
	}
}
module.exports = new Router();