var Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-twilio-sms", "Twilio", TwilioSwitch);
}

function TwilioSwitch(log, config) {
    this.log = log;

    // account info
    this.accountSid = config["accountSid"];
    this.authToken = config["authToken"];
    this.messageBody = config["messageBody"];
    this.toNumbers = config["toNumbers"];
    this.twilioNumber = config["twilioNumber"];
    this.name = config["name"];
    this.automaticallySwitchOff = config["automaticallySwitchOff"];
    this.client = require('twilio')(this.accountSid, this.authToken);
};

TwilioSwitch.prototype = {
    getServices: function () {
        var informationService = new Service.AccessoryInformation();

        informationService
                .setCharacteristic(Characteristic.Manufacturer, "Twilio")
                .setCharacteristic(Characteristic.Model, "Send an SMS")
                .setCharacteristic(Characteristic.SerialNumber, "api");

        this.switchService = new Service.Switch(this.name);
        this.switchService
                .getCharacteristic(Characteristic.On)
                .on('get', this.getPowerState.bind(this))
                .on('set', this.setPowerState.bind(this));


        return [this.switchService, informationService];
    },

    getPowerState: function (callback) {
        callback(null, false);
    },

    sendSms: function(toNumber) {
        var self = this;

        self.client.messages.create({
            to: toNumber,
            from: self.twilioNumber,
            body: self.messageBody
        }, function(err, message) {
            if (err) {
                self.log("SMS error (will retry):");
                self.log(err);
                setTimeout(function() {
                    self.log("SMS retry...");
                    self.client.messages.create({
                        to: toNumber,
                        from: self.twilioNumber,
                        body: self.messageBody
                    }, function(err, message) {
                        if (err) {
                            self.log("SMS error (giving up):");
                            self.log(err);
                        }
                        else {
                            console.log("SMS success: " + toNumber + " -> " + self.messageBody);
                        }
                    });
                }, 30000);
            }
            else {
                console.log("SMS success: " + toNumber + " -> " + self.messageBody);
            }
            if (self.automaticallySwitchOff === true) {
                self.switchService.setCharacteristic(Characteristic.On, false);
            }
        });
    },

    setPowerState: function(powerOn, callback) {
        var self = this;

        if (powerOn) {
            for (var i = 0; i < self.toNumbers.length; ++i) {
                self.sendSms(self.toNumbers[i]);
            }
        }
        callback();
    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    }
};
