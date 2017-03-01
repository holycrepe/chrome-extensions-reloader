var argument = window.location.search;
if (argument.startsWith("?"))
	argument = argument.substring(1);
if (argument) {
	window.location = argument;
} else if(window.history.length <= 1){
	window.close();
} else {
	history.back();
}
if (argument) {
	window.setTimeout(function () {
		window.location = argument;
	}, 5000);
}