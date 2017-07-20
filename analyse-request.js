
const parsePathPattern = require('./parse-path-pattern.js');

module.exports = (request, rules) => {
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