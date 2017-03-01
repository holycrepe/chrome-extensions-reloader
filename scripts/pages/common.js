// find all unpacked extensions and reload them

chrome.management.getAll(function (extensions) {
    var /** @type {chrome.management.ExtensionInfo} **/
        ext,
        /** @type {chrome.management.ExtensionInfo[]} **/
        extensionsToReload = [],
        i,j;

    for (i = 0; i < extensions.length; i++) {
        ext = extensions[i];
        if ((ext.installType == "development") &&
            (ext.enabled == true) &&
            (ext.id != chrome.runtime.id)) {
            console.log(ext.name + " reloaded");
            extensionsToReload.push(ext);
        }
    }

    extensionsToReloadRemaining = extensionsToReload.length;
    for (i = 0, j=extensionsToReload.length; i < j; i++)
        processUnpackedExtension(extensionsToReload[i]);

});