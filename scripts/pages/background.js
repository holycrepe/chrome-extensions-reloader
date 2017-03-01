var manifest               = chrome.runtime.getManifest();
var ExtensionReloaderState = {
	URL:            "http://reload.extensions",
	Name:           manifest.name,
	Argument:       "",
    Enabled:        true,
    ExtensionPages: {}
};
var isExtensionsPageURL    =
        (url,extensionId) => url.startsWith(`chrome-extension://${extensionId || ""}`);

/**
 *
 * @param activeTabs {chrome.tabs.Tab[]}
 * @param keepActiveTabOpen
 * @param settings
 */
function doReloadExtensions(activeTabs, keepActiveTabOpen, settings) {
    var queryInfo = {currentWindow: true, active: false};
    
    chrome.tabs.query({}, function (allTabs) {
        var extensionsToReloadRemaining = -1,
            /** @type {Object.<number, chrome.tabs.UpdateProperties>} **/
            extensionPageTabs = {},
            reloadExtensionMessage         = {
            action: "reload_extension",
            source: ExtensionReloaderState.Name
        };
        function onExtensionReloaded(extensionId, extensionName) {
            setTimeout(function () {
                console.log("Sending `reload_extension` Message to Extension " + extensionName + " (" + extensionId + ")");
                chrome.runtime.sendMessage(extensionId, reloadExtensionMessage);
            }, 10000);

            if (extensionsToReloadRemaining == 0) {
                console.log("Sending `reload_extension` Message to All Tabs");
                aviJS.Chrome.MessageAllTabs(reloadExtensionMessage);
            }
            else {
                console.log("Loaded `" + extensionName + "`, " + extensionsToReloadRemaining + " Extensions Remaining")
            }
        }
        /** @returns {chrome.tabs.Tab[]} **/
        var getExtensionPageTabs = 
                (extensionId) => allTabs.filter((tab) => isExtensionsPageURL(tab.url, extensionId)); 
        
        function getSettingsTabURL(extensionId) {
            for (var i=0,j=activeTabs.length;i<j;i++) {
                var activeTab = activeTabs[i],
                    url=activeTab.url;
                if (isExtensionsPageURL(url, extensionId))
                    return url;
            }
            return null;
        }
        /** @param extension {chrome.management.ExtensionInfo} **/
        function doReloadExtension(extension) {
            // disable
            chrome.management.setEnabled(extension.id, false, function () {
                // re-enable
                chrome.management.setEnabled(extension.id, true, function () {
                    // re-launch packaged app
                    if (extension.type == "packaged_app") {
                        chrome.management.launchApp(extension.id, function () {
                            onExtensionReloaded(extension.id, extension.name);
                        });
                    }
                    else {
                        onExtensionReloaded(extension.id, extension.name);
                    }
                });
            });
        }

        /** 
         * @param tab {chrome.tabs.Tab} *
         * @param callback
         */
        function createClonedTab(tab, callback) {
            var updateOptions = {
                pinned: tab.pinned,
                openerTabId: tab.openerTabId,
                url: tab.url,
                highlighted:: tab.highlighted,
                active: tab.active
            };
            var createOptions = {
                windowId: tab.windowId,
                index: tab.index + 1,
                openerTabId: tab.openerTabId,
                active: tab.active,
                pinned: tab.pinned
            };
            
            chrome.tabs.create(createOptions, function(tab) {
                if (callback)
                    callback(tab, updateOptions);
            });
        }
        /**
         * @param tab {chrome.tabs.Tab} *
         * @param callback
         */
        function createClonedExtensionTab(tab, callback) {
            createClonedTab(tab,
                /**
                 *
                 * @param clonedTab {chrome.tabs.Tab}
                 * @param updateProperties {chrome.tabs.UpdateProperties}
                 */
                function(clonedTab, updateProperties) {
                    extensionPageTabs[clonedTab.id] = updateProperties;
                    if (callback) 
                        callback();
                });
        }
        /** @param extension {chrome.management.ExtensionInfo} **/
        function processUnpackedExtension(extension) {
            if (!ExtensionReloaderState.Enabled)
                return onExtensionReloaded(extension.id, extension.name);
            var currentExtensionPageTabs = getExtensionPageTabs(extension.id);
            if (currentExtensionPageTabs.length) {
                for (var i=0,j=currentExtensionPageTabs.length;i<j;i++) {
                    createClonedExtensionTab(currentExtensionPageTabs[i], 
                        (i + 1 < j) 
                            ? undefined 
                            : () => doReloadExtension(extension));
                }
            }
            else {
                doReloadExtension(extension)
            }
        }

        if (keepActiveTabOpen && settings.reloadPage) {
            if (activeTabs.length) {
                reloadExtensionMessage.tab_ids = activeTabs.map(function (t) {
                    return t.id
                });
                reloadExtensionMessage.tab_id  = reloadExtensionMessage.tab_ids[0];
            }
        }
        aviJS.Chrome.ForUnpackedExtensions(function(extension, number, total, remaining) {
            extensionsToReloadRemaining = remaining;
            console.log(`Reloading Extension #${number}/${number} ${extension.name}`);
            processUnpackedExtension(extension);
        });

        var extensionPageTabIds = Object.keys(extensionPageTabs),
            extensionPagesCount = extensionPageTabIds.length,
            i,j;


        if (extensionPagesCount && settings.persistExtensionPages) {
            for (i=0;i<extensionPagesCount;i++) {
                var url = extensionPageTabIds[i],
                    tab = settingsTabs[url];
                chrome.tabs.update(tab, {url: url, highlighted: true});
            }
        }
        else if (settings.reloadPage) {
            // Reload the current tab based on option value
                for (i = 0, j = activeTabs.length; i < j; i++)
                    chrome.tabs.reload(activeTabs[i].id);
        }

        // show an "OK" badge
        chrome.browserAction.setBadgeText({text: "OK"});
        chrome.browserAction.setBadgeBackgroundColor({color: "#4cb749"});
        setTimeout(function () {
            chrome.browserAction.setBadgeText({text: ""});
        }, 1000);
    });
}
function reloadExtensionsFromWebRequest() {
    reloadExtensions(true);
}
function reloadExtensionsFromTab(activeTabs, keepActiveTabOpen) {
	chrome.storage.sync.get("reloadPage", function(items) {
		//debugger;
        doReloadExtensions(activeTabs, keepActiveTabOpen, items);
	});		
}

function reloadExtensions(keepActiveTabOpen) {
	chrome.tabs.query({active: true}, function (tabs) {
        reloadExtensionsFromTab(tabs, keepActiveTabOpen);
    });
    //chrome.tabs.getSelected(null, reloadExtensionsFromTab);
}

chrome.commands.onCommand.addListener(function(command) {
	if (command === "reload") {
		reloadExtensions();
	}
});

/** @param details {chrome.webRequest.WebRequestBodyDetails} **/
function onBeforeRequestEventHandler(details) {
    var wasExtensionPage = details.tabId in ExtensionReloaderState.ExtensionPages;
    if (details.url.indexOf(ExtensionReloaderState.URL) >= 0) {
        var argument = details.url.substring(ExtensionReloaderState.URL.length);
        if (argument.startsWith("/"))
            argument = argument.substring(1);
        if (argument.startsWith("?"))
            argument = argument.substring(1);
        reloadExtensionsFromWebRequest(true);
        chrome.tabs.get(details.tabId, function(tab) {
            if (tab.highlighted === false) {
                chrome.tabs.remove(details.tabId);
            }
        });
        //if (!wasExtensionPage || argument)
        return {
            // close the newly opened window
            redirectUrl: chrome.extension.getURL(`reload.html?was_extension_page=${wasExtensionPage?1:0}&tab_id=${details.tabId}&target=${argument}` + (argument.length === 0 ? "" : "?" + argument))
        };
    }
    else {
        if (isExtensionsPageURL(details.url))
            ExtensionReloaderState.ExtensionPages[details.tabId] = details.url;
        else if (wasExtensionPage)
            delete ExtensionReloaderState.ExtensionPages[details.tabId];
    }

    return {cancel: false};
}

// intercept url
chrome.webRequest.onBeforeRequest.addListener(onBeforeRequestEventHandler,
  {
    urls: [ExtensionReloaderState.URL + "/*"],
    types: ["main_frame"]
  },
  ["blocking"]
);

chrome.browserAction.onClicked.addListener(function(tab) {
	reloadExtensionsFromTab([tab], true);
});
