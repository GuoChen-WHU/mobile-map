// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.controller('MainCtrl', function($scope) {
  
  var osmLayer = new ol.layer.Tile({ 
      source: new ol.source.OSM()
  });
  var MapQuestLayer = new ol.layer.Tile({
      source: new ol.source.MapQuest({ layer: 'osm' }),
      visible: false
  });
  var MapQuestSatLayer = new ol.layer.Tile({
      source: new ol.source.MapQuest({ layer: 'sat' }),
      visible: false
  });

  var view = new ol.View({
    center: ol.proj.transform([114.31667, 30.51667], 'EPSG:4326', 'EPSG:3857'), 
    zoom: 10
  }); 
  
  var vectorLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: 'red',
        width: 2
      })
    })
  });
  
  $scope.map = new ol.Map({ 
    target: document.getElementById('map'),
    layers: [osmLayer, MapQuestLayer, MapQuestSatLayer, vectorLayer],
    view: view
  }); 
  
})

.controller('SourceCtrl', function($scope) {
  
  $scope.sourceList = [
    { value: 0, text: "OSM" },
    { value: 1, text: "MapQuest" },
    { value: 2, text: "MapQuest Satellite"}
  ];
  
  $scope.data = {
    sourceChosen: 0
  };
  
  $scope.sourceChange = function(sourceValue) {
    switchSource(sourceValue);
  };
  
  function switchSource(sourceValue) {
    var layers = $scope.map.getLayers();
    $scope.sourceList.forEach(function(source) {
      layers.item(source.value).setVisible(false);
    });
    layers.item(sourceValue).setVisible(true);
  };
})

.controller('MeasureCtrl', function($scope) {
  
  $scope.modes = [
    { value: 0, text: "length" },
    { value: 1, text: "area" }
  ];
  
  $scope.data = {
    measureMode : false,
    modeChosen: 0
  };
    
  $scope.modeChange = function (measureMode) {
    if (measureMode) {
      enableMeasure();
    } else {
      disableMeasure();
    }
  };
  $scope.modeTypeChange = function (modeType) {
    $scope.map.removeInteraction(draw);
    enableMeasure();
  };
  
  var draw;
  
  /**
   * Currently drawn feature.
   * @type {ol.Feature}
   */
  var sketch;
  
  /**
   * The measure tooltip element.
   * @type {Element}
   */
  var measureTooltipElement;


  /**
   * Overlay to show the measurement.
   * @type {ol.Overlay}
   */
  var measureTooltip;
  
  /**
   * Overlays to show the measurement, store them so we can remove them later
   * @type {Array{ol.overlay}}
   */
   var measureTooltips = [];

  /**
   * Format length output
   * @param {ol.geom.LineString} line The line.
   * @return {string} The formatted length.
   */
  var formatLength = function(line) {
    var length = 0;
    var wgs84Sphere = new ol.Sphere(6378137);
    var coordinates = line.getCoordinates();
    var sourceProj = $scope.map.getView().getProjection();
    for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
      var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
      var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
      length += wgs84Sphere.haversineDistance(c1, c2);
    }
    var output;
    if (length > 100) {
      output = (Math.round(length / 1000 * 100) / 100) +
          ' ' + 'km';
    } else {
      output = (Math.round(length * 100) / 100) +
          ' ' + 'm';
    }
    return output;
  };

  /**
   * Format area output.
   * @param {ol.geom.Polygon} polygon The polygon.
   * @return {string} Formatted area.
   */
  var formatArea = function(polygon) {
    var area;
    var wgs84Sphere = new ol.Sphere(6378137);
    var sourceProj = $scope.map.getView().getProjection();
    var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(
        sourceProj, 'EPSG:4326'));
    var coordinates = geom.getLinearRing(0).getCoordinates();
    area = Math.abs(wgs84Sphere.geodesicArea(coordinates));
    var output;
    if (area > 10000) {
      output = (Math.round(area / 1000000 * 100) / 100) +
          ' ' + 'km<sup>2</sup>';
    } else {
      output = (Math.round(area * 100) / 100) +
          ' ' + 'm<sup>2</sup>';
    }
    return output;
  };
  
  function enableMeasure() {
    var type = $scope.data.modeChosen == 0 ? 'LineString' : 'Polygon';
    var layers = $scope.map.getLayers();
    draw = new ol.interaction.Draw({
      source: layers.item(layers.getLength() - 1).getSource(),
      type: /** @type {ol.geom.GeometryType} */ (type),
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2
        }),
        image: new ol.style.Circle({
          radius: 5,
          stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 0, 0.7)'
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          })
        })
      })
    });
    $scope.map.addInteraction(draw);

    createmeasureTooltip();

    var listener;
    draw.on('drawstart',
        function(evt) {
          // set sketch
          sketch = evt.feature;

          /** @type {ol.Coordinate|undefined} */
          var tooltipCoord = evt.coordinate;

          listener = sketch.getGeometry().on('change', function(evt) {
            var geom = evt.target;
            var output;
            if (geom instanceof ol.geom.Polygon) {
              output = formatArea(geom);
              tooltipCoord = geom.getInteriorPoint().getCoordinates();
            } else if (geom instanceof ol.geom.LineString) {
              output = formatLength(geom);
              tooltipCoord = geom.getLastCoordinate();
            }
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
          });
        }, this);

    draw.on('drawend',
        function() {
          measureTooltipElement.className = 'tooltip tooltip-static';
          measureTooltip.setOffset([0, -7]);
          // unset sketch
          sketch = null;
          // unset tooltip so that a new one can be created
          measureTooltipElement = null;
          createmeasureTooltip();
          ol.Observable.unByKey(listener);
        }, this);
  }
  
  /**
   * Creates a new measure tooltip
   */
  function createmeasureTooltip() {
    if (measureTooltipElement) {
      measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';
    measureTooltip = new ol.Overlay({
      element: measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center'
    });
    measureTooltips.push(measureTooltip);
    $scope.map.addOverlay(measureTooltip);
  }
  
  /**
   * Close Measure Mode
   */
  function disableMeasure() {
    var layers,
      len;
    //remove existing features
    layers = $scope.map.getLayers(),
    len = layers.getLength();
    layers.item(len-1).getSource().clear();
    //remove draw interaction
    $scope.map.removeInteraction(draw);
    //remove all measureTooltip
    measureTooltips.forEach(function(tip) {
      $scope.map.removeOverlay(tip);
    });
  }
})

.controller('LocationCtrl', function($scope) {
  $scope.data = {
    location: false,
    direction: false,
    track: false
  };
  
  $scope.locationSwitch = function (location) {
    if (location) {
      enableLocation();
    } else {
      disableLocation();
    }
  }
  
  $scope.directionSwitch = function (direction) {
    if (direction) {
      if (!$scope.data.location) {
        enableLocation();
        $scope.data.location = true;
      }
      enableDirection();
    } else {
      disableDirection();
    }
  }
    
  $scope.trackSwitch = function (track) {
    if (track) {
      if (!$scope.data.location) {
        enableLocation();
        $scope.data.location = true;
      }
      enableTrack();
    } else {
      disableTrack();
    }
  }  

  /**
   * For location.
   * @type {ol.Geolocation}
   */
  var geolocation;
  /**
   * geolocation accuracyGeometry
   * @type {ol.geom}
   */
  var accuracyFeature;
  /**
   * geolocation positionGeometry
   * @type {ol.geom}
   */
  var positionFeature;
  /**
   * layer to display location
   * @type {ol.layer.Vector}
   */
  var locationLayer;
  /**
   * location accuracy change event
   * @type {ol.event.Key}
   */
  var geoAccuracyChangeEvent;
  /**
   * location position change event
   * @type {ol.event.Key}
   */
  var geoPositionChangeEvent;
  /**
   * device orientation
   * @type {ol.DeviceOrientation}
   */
  var deviceOrientation;
  /**
   * device orientation change event
   * @type {ol.event.Key}
   */
  var directionChangeEvent;
  /**
   * show the track route
   * @type {ol.Feature}
   */
  var trackFeature;
  /**
   * when location change, append route to trackFeature
   * @type {ol.event.Key}
   */
  var trackEvent;

  function enableLocation() {
    geolocation = new ol.Geolocation({
      projection: $scope.map.getView().getProjection(),
      tracking: true
    });
    accuracyFeature = new ol.Feature();
    geoAccuracyChangeEvent = geolocation.on('change:accuracyGeometry', function() {
      accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
    });
    positionFeature = new ol.Feature();
    positionFeature.setStyle(new ol.style.Style({
      image: new ol.style.Icon({
        src: 'img/direction_arrow.png'
      })
    }));
    geoPositionChangeEvent = geolocation.on('change:position', function() {
      var coordinates = geolocation.getPosition();
      positionFeature.setGeometry(coordinates ?
          new ol.geom.Point(coordinates) : null);
      $scope.map.getView().setCenter(coordinates);
    });
    locationLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: [accuracyFeature, positionFeature]
      })
    });
    $scope.map.addLayer(locationLayer);
  }
  
  function disableLocation() {
    $scope.map.removeLayer(locationLayer);
    geolocation.unByKey(geoAccuracyChangeEvent);
    geolocation.unByKey(geoPositionChangeEvent);
    geolocation = null;
    accuracyFeature = null;
    positionFeature = null;
    locationLayer = null;
    geoAccuracyChangeEvent = null;
    geoPositionChangeEvent = null;
  }
  
  function enableDirection() {
    deviceOrientation = new ol.DeviceOrientation({
      tracking: true
    });
    directionChangeEvent = deviceOrientation.on('change:heading', function(evt) {
      var heading = evt.target.getHeading();
      $scope.map.getView().setRotation(heading);
    });
  }
  
  function disableDirection() {
    deviceOrientation.unByKey(directionChangeEvent);
    deviceOrientation = null;
    directionChangeEvent = null;
    $scope.map.getView().setRotation(0);
  }
  
  function enableTrack() {
    trackFeature = new ol.Feature({
      geometry: new ol.geom.LineString([])
    });
    locationLayer.getSource().addFeature(trackFeature);
    
    trackEvent = geolocation.on('change:position', function() {
      var coordinate = geolocation.getPosition();
      trackFeature.getGeometry().appendCoordinate(coordinate); 
    });
  }
  
  function disableTrack() {
    geolocation.unByKey(trackEvent);
    locationLayer.getSource().removeFeature(trackFeature);
    trackFeature = null;
    trackEvent = null;
  }
})
