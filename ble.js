var noble = require('noble');
var parser = require('ble-packet');
var chalk = require('chalk');
var _ = require('lodash');

var ble = {};

ble.start = function() {
  noble.on('stateChange', stateChanged);

  function stateChanged(state) {
    if (state === 'poweredOn') {
      // console.log('Starting Scanning');
      noble.startScanning();
    } else {
      noble.stopScanning();
    }
  }
}

ble.getPeripheral = function(callback) {
  noble.on('discover', peripheralDiscovered);

  function peripheralDiscovered(peripheral) {
    console.log('Peripheral Discovered ' + peripheral.uuid);
    if(peripheral.uuid === '1c8774017310') {
      peripheral.connect(function(error) {
        callback(peripheral);
      });
    }
  }
}

ble.updateRssi = function(peripheral, time, callback) {
  setInterval(function() {
    peripheral.updateRssi(function(error, rssi) {
      callback(rssi);
    });
  }, time);
}

ble.getMeasurements = function(peripheral, callback) {
  peripheral.discoverServices(['1809'], servicesDiscovered);

  function servicesDiscovered(error, services) {
    var service = services[0];
    // console.log('Sevices Discovered ' + service.uuid);
    service.on('characteristicsDiscover', characteristicsDiscovered);
    service.discoverCharacteristics();
  }

  function characteristicsDiscovered(characteristics) {
    characteristic = characteristics[0];
    // console.log('Characteristics Discovered ' + characteristic.uuid);
    characteristic.subscribe();
    characteristic.on('data', dataReceived);
  }

  function dataReceived(data, isNotification) {
    // console.log('Buffer ' + data);
    var uuidCode = '0x' + characteristic.uuid;
    parser.parse(uuidCode, data, function (err, result) {
      // console.log(result);
      callback(result.tempC);
    });
  }
}

ble.getInfoDevice = function(peripheral, callback) {
  var serviceUUIDs = ['180f', '180a'];
  var characteristicUUIDs = ['2a19', '2a29', '2a24', '2a25', '2a23'];
  peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, discoveredSomeInfo);

  function discoveredSomeInfo(error, services, characteristics) {
    characteristics.forEach(function(characteristic) {
      characteristic.read(function(error, data) {
        var uuidCode = '0x' + characteristic.uuid;
        parser.parse(uuidCode, data, function (err, result) {
          callback(result);
        });
      });
    });
  }
}

ble.logInfo = function(peripheral) {
  var mapServices = {};
  var listOfCharacteristics = [];
  function Characteristic(service, name, json) {
    this['service'] = service;
    this['name'] = name;
    this['json'] = json;
  }

  peripheral.connect(function(error) {
    peripheral.discoverAllServicesAndCharacteristics(allDiscovered);
  });

  function allDiscovered(error, services, characteristics) {
    services.forEach(function(service) {
      mapServices[service.uuid] = service.name;
      console.log();
      console.log(chalk.blue.bold("Service: ") + service.name);
      console.log(chalk.blue.bold("Uuid: ") + service.uuid);
      console.log();
    });

    setTimeout(getCharacteristicsInfo, 500);

    function getCharacteristicsInfo() {
      characteristics.forEach(function(characteristic) {
        // characteristic.subscribe();
        // characteristic.on('data', function(data, isNotification) {
        //   var uuidCode = '0x' + characteristic.uuid;
        //   parser.parse(uuidCode, data, function (err, result) {
        //     var serviceName = mapServices[characteristic._serviceUuid];
        //     var characteristicName = characteristic.name;
        //     var json = result;
        //     listOfCharacteristics.push(new Characteristic(serviceName, characteristicName, json));
        //   });
        // });
        characteristic.read(function(error, data) {
          var uuidCode = '0x' + characteristic.uuid;
          parser.parse(uuidCode, data, function (err, result) {
            var serviceName = mapServices[characteristic._serviceUuid];
            var characteristicName = characteristic.name;
            var json = result;
            listOfCharacteristics.push(new Characteristic(serviceName, characteristicName, json));
          });
        });
      });
      setTimeout(logInfo, 5000);

      function logInfo() {
        listOfCharacteristics = _.sortBy(listOfCharacteristics, 'service');
        listOfCharacteristics.forEach(function(characteristic) {
          console.log();
          console.log(chalk.red.bold("Service: ") + characteristic['service']);
          console.log(chalk.red.bold("Name: ") + characteristic['name']);
          console.log(chalk.red.bold("Json: "));
          console.log(characteristic['json']);
          console.log();
        });
      }
    }
  }
}

module.exports = ble;
