(function ($) {
    var aviJS = this.aviJS = this.aviJS || {};
    aviJS.URL = aviJS.URL || {};
    
    (function () {
        //noinspection LocalVariableNamingConventionJS
        var Uri = this.Uri = this.Uri || new URI();

        // aviJS.URL.URLs = function(href) {
        //     var self = this;
        //     self.href = self.original = href;
        // };

        this.Params = function (href) {
            var uri   = !href ? Uri.clone() : new URI(href);
            var items = URI.parseQuery(uri.query());
            for (var key in items) {
                if (items.hasOwnProperty(key)) {
                    var value = items[key];
                    if ($.isNumeric(value) && !value.includes("."))
                        items[key] = value = Number(value);
                }
            }
            return items;
        };

        this.GET = this.Params();
        
    }).bind(aviJS.URL)()

}.bind(this)(jQuery));