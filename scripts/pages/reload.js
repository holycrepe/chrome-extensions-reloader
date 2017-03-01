/** @type {{target: string, was_extension_page, tab_id, delay, debug}} **/
var params       = aviJS.URL.GET;
var Settings = aviJS.Settings, 
    target       = params.target,
    tabHistory   = history.length - 2,
    shouldGoBack = params.was_extension_page || tabHistory > 0;
var setStatus     =
        (text, delay) => ($("#status").prepend(`<li>[${window.history.length}:${tabHistory}] ${delay ? "[" + delay + " s] " : ""}${text}`));
function doAction(text, action, delay) {
    if (typeof delay === "undefined")
        delay = params.hasOwnProperty("delay") ? params.delay : 0;
    if (!Settings.reloadPage && !params.debug)
        delay = 0;
    setStatus(text, delay);
    if (!Settings.reloadPage)
        setStatus("Skipping Action: Setting `reloadPage` is false");
    if (!action || params.debug)
        return;
    if (!Settings.reloadPage)
        action = () => window.close();
    if (delay)
        setTimeout(action, delay * 1000);
    else
        action();
}

function main(settings) {
    if (target)
        doAction(`Opening ${target}...`, () => (window.location = target), 5);
    else if (shouldGoBack)
        doAction(`Navigating Back... [${tabHistory}]`, history.back);
    else {
        chrome.tabs.query({currentWindow: true}, function (tabs) {
            debugger;
            var shouldClose = false;
            for (var i = 0, j = tabs.length; i < j; i++) {
                var tab = tabs[i];
                if (tab.id == params.tab_id)
                    continue;
                shouldClose = true;
                break;
            }
            if (shouldClose)
                return doAction(`Closing...`, window.close);
            doAction(`Skipping Closing: Could not find another tab in the current window`);
        });
    }
}

Settings.Load(main);