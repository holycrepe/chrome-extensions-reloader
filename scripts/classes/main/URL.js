(function ($) {
    var aviJS = this.aviJS = this.aviJS || {},
        RootNS = aviJS,
        ThisNS = RootNS.URL = RootNS.URL || {};

    /************* START CURRENT NAMESPACE CODE *****************/
    //noinspection LocalVariableNamingConventionJS
    var Uri = ThisNS.Current = ThisNS.Current || new URI();
    ThisNS.Params = (href) => (href ? new URI(href) : new URI()).params;
    ThisNS.GET = (new URI()).params;
    /*************  END  CURRENT NAMESPACE CODE *****************/
    
    
    aviJS.URL = ThisNS;
}.bind(this)(jQuery));