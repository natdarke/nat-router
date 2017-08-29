"use strict";
const http = require('http');
const server = http.createServer();
const router = require('way-finder');
router.setRootDir(__dirname);

// Start Applications with back-end routing
router.rule(
  'GET', 
  '/', 
  (args) => {
    args.args1 = 'Arg 1';
    let templateData = {
      args,
      greeting : "Hello"
    }
    router.template( 
      '/index.pug',
      templateData
    );
  }
);
router.rule(
  'GET', 
  '/a/:arg1/:arg2', 
  (args) => {
    let templateData = {
      args,
      greeting : "Hello"
    }
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
    let templateData = {
      args,
      data,
      greeting : "Hello"
    }
    router.template( 
      '/index.pug',
      templateData
    );
  }
);
  // Start custom failed requests
  router.status(
    404,
    (args) => {
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
    (args) => {
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
    (args) => {
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