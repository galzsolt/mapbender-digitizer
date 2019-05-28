(function () {
    "use strict";


    $(document).ready(function () {
        OpenLayers.Feature.prototype.equals = function (feature) {
            return this.fid === feature.fid;
        };
        OpenLayers.Feature.prototype.isNew = false;
        OpenLayers.Feature.prototype.isChanged = false;
        OpenLayers.Feature.prototype.isCopy = false;
        OpenLayers.Feature.prototype.disabled = false;
        OpenLayers.Feature.prototype.visible = true;
        OpenLayers.Feature.prototype.cluster = false;
        OpenLayers.Feature.prototype.getClusterSize = function () {
            return this.cluster ? this.cluster.length : null;
        };



        OpenLayers.Feature.prototype.toggleVisibility = function(visible) {
            var feature = this;
            feature.visible = visible;
        };

        // var h = OpenLayers.Events.prototype.handleBrowserEvent;
        // OpenLayers.Events.prototype.handleBrowserEvent = function() {
        //   console.warn("!");
        //   h.apply(this,arguments);
        // };
        var tc = OpenLayers.Handler.Feature.prototype.triggerCallback;

        OpenLayers.Handler.Feature.prototype.triggerCallback = function() {

            console.warn("3",arguments);
            tc.apply(this,arguments);
        };


    });

})();