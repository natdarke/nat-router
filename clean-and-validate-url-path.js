module.exports = (urlPath) => {
    let cleanAndValidUrlPath = false;
    const hasInvalidCharacters = /[^A-Z|a-z|0-9|-|.|_|~|:|\/|\?|#|\[|\]|@|!|$|&|'|\(|\)|\*|\+|,|;|=|`]/.test(urlPath);
    if(!hasInvalidCharacters){
        cleanAndValidUrlPath = urlPath.charAt(urlPath.length-1) === '/' ? urlPath.slice(0, -1) : urlPath; // remove trailing slash
    }
    return cleanAndValidUrlPath;
};