(function () {

    //noinspection LocalVariableNamingConventionJS
    var RootNS = this.aviJS = this.aviJS || {};

    (function () {
        var defaults = this.Defaults = {
            reloadPage:            false,
            persistExtensionPages: true
        },
            names = this.Names = Object.keys(this.Defaults),
            count = this.Count = this.Names.length;
    }).bind(RootNS.Settings = RootNS.Settings || {})();
}.bind(this)());