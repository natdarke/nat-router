const parsePathPattern = require('./parse-path-pattern.js');
module.exports = (rules, request) => {
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
				const parsedPath = parsePathPattern(request.urlPath, rules[i].pattern);
				if(parsedPath.match){
					matchedRule = rules[i];
					matchedRule.args = parsedPath.args;
					break;
				}
			}
		}
	}
	return matchedRule;
}