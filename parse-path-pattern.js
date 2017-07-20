module.exports = (urlPath, pattern)=>{
	var parsed = {
		match : true,
		args : {}
	};
	urlPath = urlPath.replace(/\/$/, ""); // remove trailing slash
	const patternArray = pattern.split('/');
	const urlPathArray = urlPath.split('/');
	if(patternArray.length !== urlPathArray.length){
		parsed.match = false;
		return parsed;
	}
	for(let i=1; i<patternArray.length; i++){
		if(patternArray[i].charAt(0) === ':'){
			parsed.args[patternArray[i].substring(1)] = urlPathArray[i];
		}
		else{
			if(patternArray[i] !== urlPathArray[i]){
				parsed.match = false;
				break;
			}
		}
	}
	return parsed;
}