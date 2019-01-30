var createFeatureAddedMethod = function(controlEvents) {


    /**
     * @param {(OpenLayers.Feature | OpenLayers.Feature.Vector)} feature
     */
    var func = function (feature) {

        feature.isNew = true; // replace by state == insert

        _.each(controlEvents.getDefaultAttributes(), function(prop) {
            feature.attributes[prop] = "";
        });

        feature.layer.redraw();

        controlEvents.deactivateCurrentControl();
        controlEvents.openFeatureEditDialog(feature);

        console.log("featureAdded", feature);

    };

    return func;

};


var DigitizingControlFactory = function (layer,controlEvents) {

    var featureAdded = createFeatureAddedMethod({
        deactivateCurrentControl: controlEvents.deactivateCurrentControl,
        openFeatureEditDialog: controlEvents.openFeatureEditDialog,
        getDefaultAttributes: controlEvents.getDefaultAttributes
    });

    return {
        drawPoint: new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.Point,{
            featureAdded : featureAdded
        }),

        drawLine: new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.Path,{
            featureAdded : featureAdded
        }),

        drawPolygon: new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.Polygon, {
            featureAdded : featureAdded
        }),

        drawRectangle: new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.RegularPolygon, {
            featureAdded : featureAdded,
            handlerOptions: {
                sides: 4,
                irregular: true
            }
        }),

        drawCircle: new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.RegularPolygon, {
            featureAdded : featureAdded,
            handlerOptions: {
                sides: 40
            }
        }),

        drawEllipse: new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.RegularPolygon, {
            featureAdded : featureAdded,
            handlerOptions: {
                sides: 40,
                irregular: true
            }
        }),

        drawDonut: new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.Polygon, {
            featureAdded : featureAdded,
            handlerOptions: {
                holeModifier: 'element'
            }
        }),

        modifyFeature: new OpenLayers.Control.ModifyFeature(layer,{

            /**
             * This function allows the easy use of the olEvent onModificationStart with the yml configurration
             * e.G. to prevent the modification or add additional data on modification
             * */

            onModificationStart: function (feature) {
                console.log("onModificationStart");

                if (controlEvents.preventModification()) {
                    this.deactivate();
                    this.activate();
                    $.notify(Mapbender.digitizer_translate('move.denied'));
                }


            },

            onModification: function (feature) {
                console.log("onModification",feature);
                //widget.unsavedFeatures[feature.id] = feature;
            } // http://dev.openlayers.org/docs/files/OpenLayers/Control/DragFeature-js.html
        }),

        moveFeature: new OpenLayers.Control.DragFeature(layer, {

            /**
             * This function allows the easy use of the olEvent onStart( called on drag start) with the yml configurration
             * e.G. to prevent the move or add additional data on move
             * */
            onStart: function (feature, px) {
                console.log("onStart");

                if (controlEvents.preventMove()) {
                    this.cancel();
                    $.notify(Mapbender.digitizer_translate('move.denied'));
                }

                feature.isDragged = true;
            },

            onComplete: function (feature) {
                console.log("onComplete");
                //widget.unsavedFeatures[event.id] = feature;
                if (!widget.currentPopup || !widget.currentPopup.data('visUiJsPopupDialog')._isOpen) {

                    if (schema.popup.remoteData) {
                        var bbox = feature.geometry.getBounds();
                        bbox.right = parseFloat(bbox.right + 0.00001);
                        bbox.top = parseFloat(bbox.top + 0.00001);
                        bbox = bbox.toBBOX();
                        var srid = map.getProjection().replace('EPSG:', '');
                        var url = widget.elementUrl + "getFeatureInfo/";

                        $.ajax({
                            url: url, data: {
                                bbox: bbox,
                                schema: schema.schemaName,
                                srid: srid
                            }
                        }).done(function (response) {
                            _.each(response.dataSets, function (dataSet) {
                                var newData = JSON.parse(dataSet).features[0].properties;


                                Object.keys(feature.data);
                                $.extend(feature.data, newData);


                            });
                            widget._openFeatureEditDialog(feature);

                        }).fail(function () {
                            $.notfiy("No remote data could be fetched");
                            widget._openFeatureEditDialog(feature);
                        });

                    } else {
                        widget._openFeatureEditDialog(feature);
                    }
                }
            }
        }),

        selectFeature: new OpenLayers.Control.SelectFeature(layer, {
            clickout: true,
            toggle: true,
            multiple: true,
            hover: false,
            box: true,
            toggleKey: "ctrlKey", // ctrl key removes from selection
            multipleKey: "shiftKey" // shift key adds to selection
        })
        // removeSelected: {
        //     cssClass: 'critical'
        // },
        // removeAll: {
        //     cssClass: 'critical'
        // }
    }
};