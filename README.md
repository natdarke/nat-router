## Synopsis

A simple, lightweight node server and router that can deal with requests for:

* Files
* GET
* POST. Currently supports MIME types (aka media or content type) 'application/x-www-form-urlencoded' and 'application/json'

Useful if you want a basic router without installing a full framework. Works with Pug as the rendering engine.
    

## Code Example

```JavaScript
"use strict";
const http = require('http');
const server = http.createServer();
const router = require('../router.js');
router.setRootDir(__dirname);
// For Single Page JS Applications (front end routing)
router.rule(
  'GET', 
  '*',
  () => {
    router.file( 
      '/index.html'
    );
  }
);
// For Other Applications (back end routing)
router.rule(
  'GET', 
  '/a/:arg1/:arg2', 
  (arg1, arg2) => {
    router.render( 
      '/index.pug', 
      { arg1, arg2 }
    );
  }
);
router.rule(
  'POST', 
  '/a/:arg1/:arg2',
  (arg1, arg2, data) => {
    router.render( 
      '/index.pug', 
      { arg1, arg2, data}
    );
  }
);
// custom response status pages for 404, 400, 415 etc
router.status(
  404,
  () => {
    router.render(
      '/status.pug',
      {
        title: "404 Page Not Found",
        message: "The page you requested does not exist on this web site"
      }
    );
  }
);
router.status(
  400,
  () => {
    let statusType = router.getResponse().statusType;
    let message = '';
    if(statusType==='method'){
      message = `${router.getRequest().method} requests are not supported. Only GET and POST methods are currently allowed.`
    }
    else if(statusType==='url'){
      message = 'The URL of your request contained illegal characters.'
    }
    router.render(
      '/status.pug',
      {
        title: "400 Bad Request",
        message: message
      }
    );
  }
);
router.status(
  415,
  () => {
    let statusType = router.getResponse().statusType;
    let message = '';
    if(statusType==='post'){
      message = `
        Your POST request has a missing or unsupported Content-Type in its header. 
        Only POST requests where the value of Content-Type is 'application/x-www-form-urlencoded' 
        or 'application/json' are supported
      `;
    }
    else if(statusType==='file'){
      message = `
        You have requested an unsupported file type. 
        Supported file types are .ico .html .js .json .css .png .jpg .mp3 .svg .pdf .doc .eot .ttf
      `;
    }
    router.render(
      '/status.pug',
      {
        title: "404 Unsupported Media Type",
        message: message
      }
    );
  }
);
server.on(
  'request',
  (request, response) => {
    try{
        router.resolve(request, response);
    }
    catch(error){
      console.log(error.stack);
    }
  }
);
server.listen(3000);
```


## Motivation

This project has mostly been about my own development i.e understanding Node http fundamentals wthout using the Express framework

## Installation

npm install nat-router

## API Reference

const router = require('nat-router');

### router.on(METHOD, PATTERN, CALLBACK)
* Adds a rule. All rules are checked when router.resolve is called. If the METHOD and PATTERN are matched then the CALLBACK function is called, with the with the patterns arguments (:arg1) passed to the CALLBACK 
* For POST requests, the data argument represents either 
   - The form data submitted in the body of the request (if content-type is 'application/x-www-form-urlencoded')  
   - The JSON data (parsed) sent in the body of the request (if MIME type is 'application/json')

### router.render(TEMPLATE-PATH, TEMPLATE-DATA)
* Used inside router.on. TEMPLATE-PATH is the file path of Pug template to be used and TEMPLATE-DATA is the data that is passed the aforementioned template

### router.resolve(REQUEST, RESPONSE)
* Called when any request is made, passing the standard node http REQUEST and RESPONSE objects (aka http.incomingMessage and http.serverResponse)
* If the request has a file extension of a known MIME type, it will look for a file of that name, else it will attempt to resolve the request using rules added using router.on

## Tests

There are no tests for this package yet

## Future Version
* As if often the case, it takes writing a program to realise how it should have been done. The next version of this router will have a different API (see examples below) and will be re-staructured accordingly


```JavaScript
router.rule(
  ()=>{
    router
      .when(router.test('method','GET'))
      .and(router.test('match','/a/:b/:c'))
      .or(router.test('match','/aa/:b/:c'))
      .then(router.respond('render','/index.pug');
  }
);
router.rule(
  ()=>{
    router
      .when(router.test('match','*'))
      .then(router.respond('file','/index.html'))
  }
);
router.rule(
  ()=>{
    router
      .when(router.test('statusCode','404')
      .then(router.respond('render','/404.pug');
  }
);

server.on(
  'request',
  function(request, response){
    try{
        router.resolve(request, response);
    }
    catch(error){
      console.log(error.stack);
    }
  }
);
server.listen(3000);

```

## Contributors

@natdarke

## License

GPLv3