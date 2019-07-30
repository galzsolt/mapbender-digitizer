(function () {
    "use strict";

    /**
     *
     * @param {Object} rawScheme
     * @param widget
     * @param {number} index
     * @constructor
     */

    Mapbender.Digitizer.Scheme = function (rawScheme, widget, index) {


        this.index = index;
        this.widget = widget;
        /**
         * @type {boolean}
         */
        this.allowEditData = false;

        /**
         * @type {boolean}
         */
        this.allowOpenEditDialog = false;


        var schema = this;
        $.extend(schema, rawScheme);

        schema.createPopupConfiguration_();

        schema.createSchemaFeatureLayer_();

        schema.addSelectControl_();

        schema.createMenu_();

        schema.styles = schema.styles || {};
        schema.styles.default = schema.styles.default || {};
        schema.styles.select = schema.styles.select || {};

        schema.styles.default = ol.style.StyleConverter.convertToOL4Style(schema.styles.default);
        schema.styles.select = ol.style.StyleConverter.convertToOL4Style(schema.styles.select);

        schema.layer.getSource().on('controlFactory.FeatureMoved', function (event) {
            var feature = event.feature;
            feature.setStyle(Mapbender.Digitizer.Utilities.STYLE.CHANGED);

            console.log(feature,"moved");
        });

        schema.layer.getSource().on('controlFactory.FeatureModified', function (event) {

            var feature = event.feature;

            feature.setStyle(Mapbender.Digitizer.Utilities.STYLE.CHANGED);

        });

        schema.layer.getSource().on('controlFactory.FeatureAdded', function (event) {
            var feature = event.feature;

            schema.introduceFeature(feature);

            feature.setStyle(Mapbender.Digitizer.Utilities.STYLE.CHANGED);

            schema.openFeatureEditDialog(feature);

        });

    };


    Mapbender.Digitizer.Scheme.prototype = {


        createPopupConfiguration_: function () {
            var schema = this;
            schema.popup = new Mapbender.Digitizer.PopupConfiguration(schema.popup, schema);
        },



        createSchemaFeatureLayer_: function () {
            var schema = this;
            var widget = schema.widget;


            var layer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    format: new ol.format.GeoJSON(),
                    loader: schema.getData.bind(schema),
                    strategy: ol.loadingstrategy.all // ol.loadingstrategy.bbox
                }),
                visible: false,
                strategy: ol.loadingstrategy.bbox,

            });

            schema.layer = layer;

            widget.map.addLayer(schema.layer);

        },

        createMenu_: function () {
            var schema = this;
            var widget = schema.widget;
            var element = $(widget.element);

            schema.menu = new Mapbender.Digitizer.Menu(schema);

            element.append(schema.menu.frame);

        },

        addSelectControl_: function () {
            var schema = this;
            var widget = schema.widget;


            var highlightControl = new ol.interaction.Select({

                condition: ol.events.condition.pointerMove,
                layers: [schema.layer]

            });


            schema.highlightControl = highlightControl;
            widget.map.addInteraction(schema.highlightControl);

            highlightControl.on('select', function (e) {

                e.selected.forEach(function (feature) {

                    feature.dispatchEvent({ type: 'Digitizer.HoverFeature', value: true});

                });

                e.deselected.forEach(function (feature) {
                   feature.dispatchEvent({ type: 'Digitizer.HoverFeature', value: false});
                });

            });

            highlightControl.setActive(false);

            var selectControl = new ol.interaction.Select({

                condition: ol.events.condition.singleClick,
                layers: [schema.layer],
                style: function() {
                    return null;
                }

            });

            schema.selectControl = selectControl;

            widget.map.addInteraction(schema.selectControl);

            selectControl.on('select', function (event) {
                if (schema.allowEditData || schema.allowOpenEditDialog) {
                    schema.openFeatureEditDialog(event.selected[0]);
                    selectControl.getFeatures().clear();
                }
            });

            selectControl.setActive(false);

        },

        getGeomType: function () {
            var schema = this;
            return schema.featureType.geomType;
        },

        activateSchema: function (wholeWidget) {

            var schema = this;

            var widget = schema.widget;
            var frame = schema.menu.frame;
            var layer = schema.layer;

            widget.getCurrentSchema = function () {
                return schema;
            };

            frame.show();

            schema.highlightControl.setActive(true);
            schema.selectControl.setActive(true);

            layer.setVisible(true);
        },

        deactivateSchema: function (wholeWidget) {

            var schema = this;
            var widget = schema.widget;
            var frame = schema.menu.frame;
            var layer = schema.layer;

            frame.hide();

            schema.highlightControl.setActive(false);
            schema.selectControl.setActive(false);

            if (widget.currentPopup) {
                widget.currentPopup.popupDialog('close');
            }

            schema.deactivateInteractions();

            if (!wholeWidget || !widget.displayOnInactive) {
                if (!schema.displayPermanent) {
                    layer.setVisible(false);
                }
            }

        },

        recalculateVisibility: function(activateWidget) {
            var schema = this;
            var widget = schema.widget;

            if (activateWidget) {
                if (schema.displayPermanent) {
                    schema.layer.setVisible(true);
                }
            } else {
                if (!schema.displayPermanent) {
                    schema.layer.setVisible(false);
                }
            }

        },

        deactivateInteractions: function() {
            var schema = this;
            schema.menu.toolSet.activeInteraction && schema.menu.toolSet.activeInteraction.setActive(false);
            schema.highlightControl.setActive(false);
            schema.selectControl.setActive(false);
        },


        openFeatureEditDialog: function (feature) {
            var schema = this;
            schema.popup.createFeatureEditDialog(feature, schema);
        },



        introduceFeature: function(feature) {

            var schema = this;
            feature.mbOrigin = 'digitizer';

            feature.setStyle(schema.styles.default);

            feature.on('Digitizer.HoverFeature', function(event) {

                schema.menu.resultTable.hoverInResultTable(feature,event.value);
                feature.setStyle(event.value ? schema.styles.select : schema.styles.default);

            });
        },


        createRequest_: function (projectionCode) {
            var schema = this;

            return {
                srid: projectionCode,
                maxResults: schema.maxResults,
                schema: schema.schemaName,
            }

        },

        getData: function (extent, resolution, projection) {
            var schema = this;
            var widget = schema.widget;

            var request = schema.createRequest_(projection.getCode().split(":").pop());

            var selectXHR = widget.query('select', request).then(schema.onFeatureCollectionLoaded.bind(schema));

            return selectXHR;
        },



        onFeatureCollectionLoaded: function (featureCollection) {
            var schema = this;


            if (!featureCollection || !featureCollection.hasOwnProperty("features")) {
                Mapbender.error(Mapbender.DigitizerTranslator.translate("features.loading.error"), featureCollection);
                return;
            }

            if (featureCollection.features && featureCollection.features.length === parseInt(schema.maxResults)) {
                Mapbender.info("It is requested more than the maximal available number of results.\n ( > " + schema.maxResults + " results. )");
            }


            var geoJsonReader = new ol.format.GeoJSON();
            var newFeatures = geoJsonReader.readFeaturesFromObject({
                type: "FeatureCollection",
                features: featureCollection.features
            });






            newFeatures.forEach(function (feature) {
                schema.introduceFeature(feature);
            });
            schema.layer.getSource().addFeatures(newFeatures);


            schema.menu.resultTable.redrawResultTableFeatures(newFeatures);




        },


        // Overwrite
        getLayerFeatures: function () {
            var schema = this;
            return schema.layer.getSource().getFeatures();
        },



        removeAllFeatures: function () {
            var schema = this;
            schema.layer.getSource().clear();
        },


        saveFeature: function (feature, formData) {
            var schema = this;
            var widget = schema.widget;

            var createNewFeatureWithDBFeature = function (feature, response) {

                var features = response.features;

                if (features.length === 0) {
                    console.warn("No Feature returned from DB Operation");
                    schema.layer.getSource().removeFeature(feature);
                    return null;
                } else if (features.length > 1) {
                    console.warn("More than 1 Feature returned from DB Operation");
                }

                var geoJsonReader = new ol.format.GeoJSON();

                var newFeatures = geoJsonReader.readFeaturesFromObject(response);
                var newFeature = _.first(newFeatures);

                schema.introduceFeature(newFeature);

                return newFeature;

            };

            var request = {
                id: feature.getId(),
                properties: formData,
                geometry:  new ol.format.WKT().writeGeometryText(feature.getGeometry()),
                srid: widget.map.getView().getProjection().getCode().split(':').pop(),
                type: "Feature"
            };


            var promise = widget.query('save', {
                schema: schema.schemaName,
                feature: request
            }).then(function (response) {

                if (response.errors) {

                    response.errors.forEach(function (error) {
                        console.error(error.message);
                        $.notify(error.message, {
                            title: 'API Error',
                            autoHide: false,
                            className: 'error'
                        });
                    });

                } else {


                    var newFeature = createNewFeatureWithDBFeature(feature, response);

                    if (newFeature == null) {
                        console.warn("Creation of new Feature failed");
                        return;
                    }

                    schema.layer.getSource().removeFeature(feature);
                    schema.layer.getSource().addFeature(newFeature);

                    schema.menu.resultTable.redrawResultTableFeatures(schema.layer.getSource().getFeatures());

                    $.notify(Mapbender.DigitizerTranslator.translate("feature.save.successfully"), 'info');

                }

                return response;

            });

            return promise;

        },



    };


})();
