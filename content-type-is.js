module.exports = (request) => {
	// currently only POST content-type (aka MIME type or media type)
	// 'application/x-www-form-urlencoded' (typically forms) and 
	// 'application/json' (typically webhooks or other API requests)
	// are supported
	let contentType = 'unsupported';
	if(request.headers['content-type']){
		if(request.headers['content-type'].indexOf('application/x-www-form-urlencoded')!==-1){
			contentType = 'urlencoded';
		}
		else if (request.headers['content-type'].indexOf('application/json')!==-1){
			contentType = 'json';
		}
	}
	return contentType;
};