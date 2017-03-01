(function () {

    //noinspection LocalVariableNamingConventionJS
    var aviJS = this.aviJS = this.aviJS || {},
        RootNS = aviJS,
        ThisNS = RootNS.Chrome = RootNS.Chrome || {};

        var settings        = {
            reloadExtensionTabs: () => true,
            reloadActiveExtensionTabsOnly: () => true
        };

        /** @param tab {chrome.tabs.Tab} */
        var reloadTab = (tab) => chrome.tabs.reload(tab.id);

        /** @param tab {chrome.tabs.Tab} */
        var debugTab = (tab) => console.log(tab);

        ThisNS.MessageAllTabs = function (message, ignoredIds) {
            if (typeof message === "string") {
                message = {
                    action: message
                };
            }
            ThisNS.forAllTabs(
                /** @param tab {chrome.tabs.Tab} */
                function (tab) {
                    chrome.tabs.sendMessage(tab.id, message);
                },
                function (tabTitles) {
                    if (RootNS.Debug.IsActive('Messaging.MessageAllTabs')) {
                        console.log(`MessageAllTabs: ${JSON.stringify(message)}\n    - ` + tabTitles.join("\n    - "), message);
                    }
                },
                ignoredIds);

        };

        ThisNS.ReloadExtensionTabs = function (options) {
            options = options || {};
            if (!settings.reloadExtensionTabs())
                return;
            if (settings.reloadActiveExtensionTabsOnly())
                $.extend(options, {
                    highlighted: true,
                    active:      true
                });

            ThisNS.forExtensionTabs(
                reloadTab,
                function (tabTitles) {
                    if (RootNS.Debug.IsActive('Events.ReloadExtension.ReloadExtensionTabs')) {
                        console.log("ReloadExtensionTabs: " + (tabTitles.length ? "\n    - " + tabTitles.join("\n    - ") : "No Matching Tabs Found"));
                    }
                }, options);
        };
        ThisNS.Command             = function (baseRequest, cmdType, mainCallback) {
            var self     = this;
            self.cmdType = cmdType;
            ThisNS.create  = (options, callback) =>
                ThisNS.send("create_" + ThisNS.cmdType, options, callback);
            ThisNS.delete  = (options, callback) =>
                ThisNS.send("delete_" + ThisNS.cmdType, options, callback);
            ThisNS.send    = function (cmdType, options, callback) {
                if (typeof cmdType === "string")
                    cmdType = {"cmd": cmdType};
                var request = $.extend({}, baseRequest, cmdType, options || {});
                chrome.runtime.sendMessage(request, function (response) {
                    if (mainCallback)
                        mainCallback(response);
                    if (callback)
                        callback(response);
                });
            };
        };

        ThisNS.ContextMenuCommand = (contextMenuType, title, baseRequest, mainCallback) =>
            new ThisNS.Command(
                $.extend({
                    context_menu_type: contextMenuType,
                    title:             title
                }, baseRequest),
                "menu", mainCallback);

        /**
         *
         * @returns {Array<string>}
         */
        ThisNS.getContentScriptUrls = function () {
            var urls           = [];
            var manifest       = chrome.runtime.getManifest();
            var contentScripts = manifest["content_scripts"];
            for (var i = 0; i < contentScripts.length; i++) {
                var matches = contentScripts[i].matches;
                for (var j = 0; j < matches.length; j++) {
                    urls.pushUnique(matches[j]);
                }
            }
            return urls;
        };

        /**
         *
         * @returns {Array<RegExp>}
         */
        ThisNS.getContentScriptUrlPatterns = function () {
            var urls     = ThisNS.getContentScriptUrls(),
                patterns = [];
            for (var i = 0, length = urls.length; i < length; i++) {
                patterns.push(RegExp.fromGlob(urls[i]));
            }
            return patterns;
        };


        ThisNS.forExtensionTabs = function (callback, onCompleteCallback, options) {
            var urls      = ThisNS.getContentScriptUrlPatterns();
            var urlLength = urls.length;

            ThisNS.forAllTabs(
                /** @param tab {chrome.tabs.Tab} */
                function (tab) {
                    if (tab.url.startsWith("chrome://"))
                        return false;

                    for (var i = 0; i < urlLength; i++) {
                        if (urls[i].test(tab.url)) {
                            var result = callback(tab);
                            if (result !== false) {
                                return true;
                            }
                        }
                    }
                    return false;
                },
                onCompleteCallback, options);
        };

        ThisNS.forAllTabs = function (callback, onCompleteCallback, options) {
            if (Array.isArray(options)) {
                options = {
                    ignoredIds: options
                };
            }
            options        = options || {};
            var ignoredIds = options.ignoredIds || [];

            chrome.windows.getAll({
                populate: true
            }, function (windows) {
                var tabTitles = [];
                windows.forEach(function (window) {
                    window.tabs.forEach(
                        /** @param tab {chrome.tabs.Tab} */
                        function (tab) {
                            if ((options.highlighted && !tab.highlighted)
                                || (options.active && !tab.active))
                                return;
                            if (!Array.isArray(ignoredIds)) {
                                debugger;
                            }
                            if (typeof ignoredIds.includes != "function") {
                                debugger;
                            }
                            if (!ignoredIds.includes(tab.id)) {
                                var result = callback(tab);
                                if (result !== false) {
                                    tabTitles.push(tab.title);
                                }
                            }
                        });
                });
                if (onCompleteCallback) {
                    onCompleteCallback(tabTitles);
                }
            });
        };


        ThisNS.GetUnpackedExtensions =
            /**
             *
             * @param callback {Function<chrome.management.ExtensionInfo[]>}
             */
                function (callback) {
                chrome.management.getAll(function (extensions) {
                    var /** @type {chrome.management.ExtensionInfo} **/
                        ext,
                        /** @type {chrome.management.ExtensionInfo[]} **/
                        unpackedExtensions = [],
                        i, j;

                    for (i = 0, j = extensions.length; i < j; i++) {
                        ext = extensions[i];
                        if ((ext.installType == "development") &&
                            (ext.enabled == true) &&
                            (ext.id != chrome.runtime.id)) {
                            unpackedExtensions.push(ext);
                        }
                    }

                    callback(unpackedExtensions);
                });
            };

        ThisNS.ForUnpackedExtensions =
            /**
             *
             * @param callback {Function<chrome.management.ExtensionInfo, number, number, number>}
             * @summary Calls callback with parameters (extension, current, total, remaining), where current is the 1-based index
             */
                function (callback) {
                ThisNS.GetUnpackedExtensions(function (unpackedExtensions) {
                    var total = unpackedExtensions.length,
                        i, j;
                    for (i = 0, j = unpackedExtensions.length; i < j; i++)
                        callback(unpackedExtensions[i], i + 1, total, total - i - 1);
                });
            };
    aviJS.Chrome = ThisNS;
}.bind(this)());