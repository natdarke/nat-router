## Synopsis

A simple, lightweight node server and router that can deal with requests for:

* Files
* GET
* POST. Currently supports MIME types (aka media or content type) 'application/x-www-form-urlencoded' and 'application/json'

Useful if you want a basic router without installing a full framework. Works with Pug as the rendering engine. Can work with Single page web applications.

Supports custom html pages for failed request such as 400, 404, 415, and can even distinguish between differnt types of failures.
    

## Code Example

```JavaScript
"use strict";
const http = require('http');
const server = http.createServer();
const router = require('nat-router');
router.setRootDir(__dirname);

// Start Applications with back-end routing
router.rule(
  'GET', 
  '/a/:arg1/:arg2', 
  (args) => {
    let templateData = myController(args); // pass the args to your own controller
    router.template( 
      '/index.pug',
      templateData
    );
  }
);
router.rule(
  'POST', 
  '/a/:arg1/:arg2',
  (args, data) => {
    let templateData = myController(args, data);  // pass the args and POST data to your own controller
    router.template( 
      '/index.pug',
      templateData
    );
  }
);
  // Start custom failed requests
  router.status(
    404,
    () => {
      router.template(
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
      let statusCodeType = router.getStatusCodeType();
      let message = '';
      if(statusCodeType==='Method'){
        message = `${router.getRequest().method} requests are not supported. Only GET and POST methods are currently allowed.`
      }
      else if(statusCodeType==='URL: Illegal Characters'){
        message = 'The URL of your request contained illegal characters.'
      }
      router.template(
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
      let statusCodeType = router.getStatusCodeType();
      let message = '';
      if(statusCodeType==='Content-Type: Unsupported '){
        message =
          `Your POST request has an unsupported Content-Type in its header. 
          Only 'application/x-www-form-urlencoded' and 'application/json' are supported.`;
      }
      else if(statusCodeType==='Content-Type: Missing '){
        message = 
          `Your POST request has a missing Content-Type in its header. 
          Content-Type must be 'application/x-www-form-urlencoded' or 'application/json'.`;
      }
      router.template(
        '/status.pug',
        {
          title: "415 Unsupported Media Type",
          message: message
        }
      );
    }
  );
  // Start custom failed requests
// End applications with back-end routing
// Start applications with front-end routing (single page js apps)
router.rule(
  'GET', 
  '*',
  () => {
    router.file( 
      '/index.html'
    );
  }
);
//End applications with front-end routing (single page js apps)
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

### router.setRootDir(__dirname);
* Required
* Sets the root directory as the currect directory

### router.rule(METHOD, PATTERN, CALLBACK)
* Adds a rule. All rules are checked when router.resolve is called. If the METHOD and PATTERN are matched then the CALLBACK function is called, with the patterns arguments (:arg1) passed to the any templates rendered inside the callback using router.template 
* For POST requests, an object called data will also be passed to any templates rendered inside the callback using router.template, representing either
   - The URL encoded form data submitted in the body of the request (if content-type is 'application/x-www-form-urlencoded')  
   - The JSON data (parsed) sent in the body of the request (if MIME type is 'application/json')

### router.status(STATUS-CODE, CALLBACK)
* Create custom HTML pages, or templates for failed requests.
* Similar to router.rule, it allows you to use router.template or router.file for specific statusCodes like 400, 404 and 415.
* If you use router.template inside the CALLBACK, you can optionally add an object which is passed to the template, thus allowing you to have one template for all failed requests, with varying content
* In addition, router.getStatusCodeType() returns a more specific reason for the failed request, allowing you to give better information in your HTML page. At the moment, router.getStatusCodeType() will can return 'Content-Type: Unsupported' or 'Content-Type: Missing' for a 415:, 'URL: Illegal Characters' for a 400 . See examples for use.


### router.template(TEMPLATE-PATH [, TEMPLATE-DATA])
* Used inside router.template. TEMPLATE-PATH is the file path of Pug template to be used. Optional TEMPLATE-DATA is data that will be passed to the template. It replaces any automatically generated data from PATTERN in router.rule as well as any POST body data

### router.file(FILE-PATH)
* Used inside router.template. FILE-PATH is the file path of a file, usually an html file to be used with a single page web application

### router.resolve(REQUEST, RESPONSE)
* Required
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
      .when(router.test('statusCode','404'))
      .then(router.respond('render','/404.pug'));
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