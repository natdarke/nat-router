## Synopsis

A light-weight, unopinionated router for Node that can deal with requests for:

* Files
* GET
* POST. Currently supports MIME types (aka media or content type) 'application/x-www-form-urlencoded' and 'application/json'

Useful if you want a basic router without installing a full framework. Works with Pug as the rendering engine. Can work with Single page web applications.

Supports custom html pages for failed request such as 400, 404, 415, and can even distinguish between different types of failures.
    

## Code Example

```JavaScript
"use strict";
const http = require('http');
const server = http.createServer();
const router = require('way-finder');
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
      if(statusCodeType==='Content-Type: Unsupported'){
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
* Adds a rule. All rules are checked when router.resolve is called. If the METHOD and PATTERN are matched then the CALLBACK function is called. 
* If the METHOD is 'GET' the CALLBACK accepts 1 argument.
  * This argument will be an object with keys and values determined by the pattern and the url
  * e.g. if the pattern is /a/:b/:c and the url of the rquest is a/red/blue, the object will be { b: 'red', c: 'blue'}
* If the method is 'POST' the CALLBACK accepts 2 arguments
  * The first will be an object the same as for the 'GET' METHOD (see above)  
  * The second will be an object representing the POST data in the body of the request, and can be either:
    * URL encoded (if content-type is 'application/x-www-form-urlencoded')  
    * JSON data (parsed) (if MIME type is 'application/json')

### router.status(STATUS-CODE, CALLBACK)
* Create custom HTML pages, or templates for failed requests.
* This works in the same way as router.rule, except that it works with unsuccessful requests i.e. when the response has a status code like 400, 404 and 415. This allows you to have one template for all failed requests, with varying content
* In addition, router.getStatusCodeType() returns a more specific reason for the failed request, allowing you to give better information in your HTML page. At the moment, router.getStatusCodeType() will can return 'Content-Type: Unsupported' or 'Content-Type: Missing' for a 415:, 'URL: Illegal Characters' for a 400 . See examples for use.


### router.template(TEMPLATE-PATH, TEMPLATE-DATA)
* Used inside the CALLBACK of router.rule(METHOD, PATTERN, CALLBACK)
* TEMPLATE-PATH is the file path of Pug template to be used. 
* TEMPLATE-DATA is data that will be passed to the template. TEMPLATE-DATA would normally be data determined by the arguments passed to the CALLBACK of router.rule(METHOD, PATTERN, CALLBACK)

### router.file(FILE-PATH)
* Used inside the CALLBACK of router.rule(METHOD, PATTERN, CALLBACK)
* FILE-PATH is the file path of a file, usually an html file to be used with a single page web application

### router.resolve(REQUEST, RESPONSE)
* Required
* This is called every time a request is made
* REQUEST is a Node http.incomingMessage object
* RESPONSE is a Node http.serverResponse object
* If the request has a file extension of a known MIME type, it will look for a file of that name, else it will attempt to resolve the request using rules added using router.rule(METHOD, PATTERN, CALLBACK)

## Tests

* npm test

## To Do
* Check POST data is valid
* Allow query string on static files


## Future Version
* As if often the case, it takes writing a program to realise how it should have been done. The next version of this router will have a different API (see examples below) and will be re-staructured accordingly


```JavaScript
router.rule(
  (args)=>{
    router
      .when(router.test('method','GET'))
      .and(router.test('match','/a/:b/:c'))
      .or(router.test('match','/aa/:b/:c'))
      .then(router.respond('render','/index.pug', args);
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