module.exports = (chunks, contentType) => {
	var parsedBodyData = {};
	if(chunks.length > 0){
		const bodyDataString = Buffer.concat(chunks).toString();
		if(contentType === 'urlencoded'){
			parsedBodyData = qs.parse(bodyDataString);
		}
		else if(contentType === 'json'){
			parsedBodyData = JSON.parse(bodyDataString);
		}
	}
	return parsedBodyData;
};