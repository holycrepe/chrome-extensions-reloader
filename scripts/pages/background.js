var manifest               = chrome.runtime.getManifest(),
    ExtensionReloaderState = {
	URL:            "http://reload.extensions",
	Name:           manifest.name,
	Argument:       "",
    Enabled:        true,
    ExtensionPages: {}
},
    isExtensionsPageURL    =
        (url,extensionId) => url.startsWith(`chrome-extension://${extensionId || ""}`),
    Settings = aviJS.Settings;

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
            extensionPageOriginalTabIds = [],
            reloadExtensionMessage         = {
            action: "reload_extension",
            source: ExtensionReloaderState.Name
        };
        function messageAllTabs() {
            console.log("Sending `reload_extension` Message to All Tabs");
            aviJS.Chrome.MessageAllTabs(reloadExtensionMessage);
        }
        function reloadTabs() {
            var extensionPageTabIds = Object.keys(extensionPageTabs).map(Number),
                extensionPagesCount = extensionPageTabIds.length,
                i,j;
            //console.log(`Found ${extensionPagesCount} Extension Page(s)`);


            if (extensionPagesCount && settings.persistExtensionPages) {
                console.log(`Reloading ${extensionPagesCount} Extension Page(s))`);
                for (i=0;i<extensionPagesCount;i++) {
                    var tabId = extensionPageTabIds[i],
                        updateProperties = extensionPageTabs[tabId];
                    chrome.tabs.update(tabId, updateProperties);
                }
            }
            if (settings.reloadPage) {
                var tabIdsToReload = activeTabs.map(tab=>tab.id).filter(id=>!extensionPageOriginalTabIds.includes(id));
                j = tabIdsToReload.length;
                if (j) {
                    console.log(`Reloading ${j} Triggering Tab(s)`);
                    // Reload the current tab based on option value
                    for (i = 0; i < j; i++)
                        chrome.tabs.reload(tabIdsToReload[i].id);
                }
            }
            setTimeout(function () {
                chrome.browserAction.setBadgeText({text: ""});
            }, 5000);
        }
        function onAllExtensionsReloaded() {
            //console.log("Completed Reloading All Extensions");
            messageAllTabs();
            reloadTabs();
        }
        function onExtensionReloaded(extensionId, extensionName) {
            setTimeout(function () {
                console.log("Sending `reload_extension` Message to Extension " + extensionName + " (" + extensionId + ")");
                chrome.runtime.sendMessage(extensionId, reloadExtensionMessage);
            }, 10000);

            if (extensionsToReloadRemaining == 0) {
                onAllExtensionsReloaded();
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
                highlighted: tab.highlighted,
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
                    //console.log(`Cloned Extension Tab #${Object.keys(extensionPageTabs).length+1} To #${clonedTab.id} From ${tab.url}`);
                    extensionPageOriginalTabIds.push(tab.id);
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

        // show an "OK" badge
        chrome.browserAction.setBadgeText({text: "OK"});
        chrome.browserAction.setBadgeBackgroundColor({color: "#4cb749"});

    });
}
function reloadExtensionsFromWebRequest() {
    reloadExtensions(true);
}
function reloadExtensionsFromTab(activeTabs, keepActiveTabOpen) {
    Settings.Load(function(items) {
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
            redirectUrl: chrome.extension.getURL(`pages/reload.html?was_extension_page=${wasExtensionPage?1:0}&tab_id=${details.tabId}&target=${argument}`)
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
