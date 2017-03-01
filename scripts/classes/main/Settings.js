(function ($) {

    //noinspection LocalVariableNamingConventionJS
    var aviJS = this.aviJS = this.aviJS || {},
        RootNS = aviJS,
        ThisNS = RootNS.Settings = RootNS.Settings || {};

    var defaults = ThisNS.Defaults = {
            reloadPage:            false,
            persistExtensionPages: true
        },
        names = ThisNS.Names = Object.keys(defaults);
    ThisNS.Load    = (callback) => {
        chrome.storage.sync.get(function(items) {
            $.extend(true, ThisNS, items);
            callback(items);
        })
    };
    ThisNS.Count   = names.length;
    $.extend(true, ThisNS, defaults);
    aviJS.Settings = ThisNS;

}.bind(this)(jQuery));
