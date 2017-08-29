"use strict";
const http = require('http');
const server = http.createServer();
const router = require('../way-finder.js');
const httpMocks = require('node-mocks-http');
router.setRootDir(__dirname);
// beforeEach(() => {
//   jest.resetModules();
// });
describe(
  'Rule GET /', 
  function(){
    router.rule(
      'GET', 
      '/', 
      (args) => {
        let templateData = {
          args,
          greeting : "Hello"
        };
        router.template( 
          '/index.pug',
          templateData
        );
      }
    );
    test(
      'Request for / responds with 200', 
      done => {
        let req = httpMocks.createRequest({
          method: 'GET',
          url: '/'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        expect(res.statusCode).toBe(200);
        done();
      }
    );
  }
);
describe(
  'Rule GET /a/:arg1/:arg2', 
  function(){
    router.rule(
      'GET', 
      '/a/:arg1/:arg2', 
      (args) => {
        let templateData = {
          args,
          greeting : "Hello"
        };
        router.template( 
          '/index.pug',
          templateData
        );
      }
    );
    test(
      'Request for /a/b/c responds with 200 and router has correct arguments set', 
      done => {
        let req = httpMocks.createRequest({
          method: 'GET',
          url: '/a/b/c'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        expect(res.statusCode).toBe(200);
        expect(router.getArgs()).toMatchObject({
          arg1: 'b',
          arg2: 'c'
        });
        done();
      }
    );
    test(
      'Request for /a/b/c/ responds with 200 and router has correct arguments set', 
      done => {
        let req = httpMocks.createRequest({
          method: 'GET',
          url: '/a/b/c/'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        expect(res.statusCode).toBe(200);
        expect(router.getArgs()).toMatchObject({
          arg1: 'b',
          arg2: 'c'
        });
        done();
      }
    );
    test(
      `Request for /a/b/c^ responds with 400 and statusCodeType is 'URL: Illegal Characters'`, 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c^'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        expect(res.statusCode).toBe(400);
        expect(router.getStatusCodeType()).toBe('URL: Illegal Characters');
        done();
      }
    );
  }
);
describe(
  'Rule POST /a/:arg1/:arg2', 
  function(){
    router.rule(
      'POST', 
      '/a/:arg1/:arg2', 
      (args, data) => {
        let templateData = {
          args,
          data,
          greeting : "Hello"
        };
        router.template( 
          '/index.pug',
          templateData
        );
      }
    );
    test(
      'Request for /a/b/c with JSON data responds with 200. Router has correct args.', 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c',
          headers: {
            'Content-Type' : 'application/json'
          },
          body: {
            one: '1',
            two: '2'
          }
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        req.emit('data', new Buffer(JSON.stringify(req.body), 'utf-8'));
        req.emit('end');
        expect(res.statusCode).toBe(200);
        expect(router.getArgs()).toMatchObject({
          arg1: 'b',
          arg2: 'c'
        });
        expect(router.getBodyData()).toMatchObject({
          one: '1',
          two: '2'
        });
        done();
      }
    );
    test(
      'Request for /a/b/c/ with JSON data responds with 200. Router has correct args.', 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c/',
          headers: {
            'Content-Type' : 'application/json'
          },
          body: {
            one: '1',
            two: '2'
          }
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        req.emit('data', new Buffer(JSON.stringify(req.body), 'utf-8'));
        req.emit('end');
        expect(res.statusCode).toBe(200);
        expect(router.getArgs()).toMatchObject({
          arg1: 'b',
          arg2: 'c'
        });
        expect(router.getBodyData()).toMatchObject({
          one: '1',
          two: '2'
        });
        done();
      }
    );
    test(
      'Request for /a/b/c with FORM data responds with 200. Router has correct args.', 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c',
          headers: {
            'Content-Type' : 'application/x-www-form-urlencoded'
          },
          body: 'one=1&two=2'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        req.emit('data', new Buffer(req.body, 'utf-8'));
        req.emit('end');
        expect(res.statusCode).toBe(200);
        expect(router.getArgs()).toMatchObject({
          arg1: 'b',
          arg2: 'c'
        });
        expect(router.getBodyData()).toMatchObject({
          one: '1',
          two: '2'
        });
        done();
      }
    );
    test(
      'Request for /a/b/c/ with FORM data responds with 200. Router has correct args.', 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c/',
          headers: {
            'Content-Type' : 'application/x-www-form-urlencoded'
          },
          body: 'one=1&two=2'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        req.emit('data', new Buffer(req.body, 'utf-8'));
        req.emit('end');
        expect(res.statusCode).toBe(200);
        expect(router.getArgs()).toMatchObject({
          arg1: 'b',
          arg2: 'c'
        });
        expect(router.getBodyData()).toMatchObject({
          one: '1',
          two: '2'
        });
        done();
      }
    );
    test(
      `Request for /a/b/c with MISSING Content-Type responds with 415 and statusCodeType is 'Content-Type: Missing'`, 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c',
          body: 'one=1&two=2'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        req.emit('data', new Buffer(req.body, 'utf-8'));
        req.emit('end');
        expect(res.statusCode).toBe(415);
        expect(router.getStatusCodeType()).toBe('Content-Type: Missing');
        done();
      }
    );
    test(
      `Request for /a/b/c with INVALID Content-Type responds with 415 and statusCodeType is 'Content-Type: Unsupported'`, 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c',
          headers: {
            'Content-Type' : 'application/x-www-form-urlencodeXXX'
          },
          body: 'one=1&two=2'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        req.emit('data', new Buffer(req.body, 'utf-8'));
        req.emit('end');
        expect(res.statusCode).toBe(415);
        expect(router.getStatusCodeType()).toBe('Content-Type: Unsupported');
        done();
      }
    );
    test(
      `Request for /a/b/c with UNSUPPORTED Content-Type responds with 415 and statusCodeType is 'Content-Type: Unsupported'`, 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c',
          headers: {
            'Content-Type' : 'multipart/form-data'
          },
          body: 'one=1&two=2'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        req.emit('data', new Buffer(req.body, 'utf-8'));
        req.emit('end');
        expect(res.statusCode).toBe(415);
        expect(router.getStatusCodeType()).toBe('Content-Type: Unsupported');
        done();
      }
    );
    test(
      `Request for /a/b/c^ responds with 400 and statusCodeType is 'URL: Illegal Characters'`, 
      done => {
        let req = httpMocks.createRequest({
          method: 'POST',
          url: '/a/b/c^',
          headers: {
            'Content-Type' : 'multipart/form-data'
          },
          body: 'one=1&two=2'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        req.emit('data', new Buffer(req.body, 'utf-8'));
        req.emit('end');
        expect(res.statusCode).toBe(400);
        expect(router.getStatusCodeType()).toBe('URL: Illegal Characters');
        done();
      }
    );
  }
);

describe(
  'Rule PUT /a/:arg1/:arg2', 
  function(){
    router.rule(
      'PUT', 
      '/a/:arg1/:arg2', 
      () => {
          router.template('/index.pug');
      }
    );
    test(
      `Request for /a/b/c/ responds with 400 and statusCodeType is 'Method: Unsupported'`, 
      done => {
        let req = httpMocks.createRequest({
          method: 'PUT',
          url: '/a/b/c/'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        expect(res.statusCode).toBe(400);
        expect(router.getStatusCodeType()).toBe('Method: Unsupported');
        done();
      }
    );
  }
);
describe(
  'Rule DELETE /a/:arg1/:arg2', 
  function(){
    router.rule(
      'DELETE', 
      '/a/:arg1/:arg2', 
      () => {
          router.template('/index.pug');
      }
    );
    test(
      `Request for /a/b/c/ responds with 400 and statusCodeType is 'Method: Unsupported'`, 
      done => {
        let req = httpMocks.createRequest({
          method: 'DELETE',
          url: '/a/b/c/'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        expect(res.statusCode).toBe(400);
        expect(router.getStatusCodeType()).toBe('Method: Unsupported');
        done();
      }
    );
  }
);
// Start applications with front-end routing (single page js apps)
describe(
  'Single page app. All requests return the same html page', 
  function(){
    router.rule(
      'GET', 
      '*',
      () => {
        router.file( 
          '/index.html'
        );
      }
    );
    test(
      'Request for /xxxxxxxxxxxxxxx responds with 200', 
      done => {
        let req = httpMocks.createRequest({
          method: 'GET',
          url: '/xxxxxxxxxxxxxxx'
        });
        let res = httpMocks.createResponse();
        router.resolve(req, res);
        expect(res.statusCode).toBe(200);
        done();
      }
    );
  }
);
//End applications with front-end routing (single page js apps)