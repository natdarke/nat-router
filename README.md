## Synopsis

A simple, lightweight node server and router that can deal with requests for:

* Files
* GET
* POST. Currently supports MIME types (aka media or content type) 'application/x-www-form-urlencoded' and 'application/json'

Useful if you want a basic router without installing a full framework. Works with Pug as the rendering engine.
    

## Code Example

```JavaScript
const http = require('http');
const server = http.createServer();
const router = require('nat-router');
router.on(
  'GET', 
  '/test/:arg1/:arg2', 
  function(arg1, arg2){
    router.render( 
      `${__dirname}/view/template-1.pug`, 
      { arg1, arg2 }
    );
  }
);
router.on(
  'POST', 
  '/a/:arg1/:arg2',
  (arg1, arg2, data) => {
    router.render( 
      `${__dirname}/view/template-2.pug`, 
      { arg1, arg2, data}
    );
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

## Contributors

@natdarke

## License

GPLv3