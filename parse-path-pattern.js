module.exports = (urlPath, pattern)=>{
	var parsed = {
		match : true,
		args : {}
	};
	if(pattern==='*'){
		// for single page js apps
		// all url paths are considered a match
		// because routing to be done on the client side
		return parsed;
	}
	else{
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
	}
	return parsed;
}