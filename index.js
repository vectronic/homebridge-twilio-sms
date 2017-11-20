"use strict";

var Service, Characteristic;


module.exports = function(homebridge) {

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-twilio-sms", "Twilio", TwilioSwitch);
};


function TwilioSwitch(log, config) {
    this.log = log;

    this.accountSid = config["accountSid"];
    if (!this.accountSid) {
        throw new Error("Missing accountSid!");
    }

    this.authToken = config["authToken"];
    if (!this.authToken) {
        throw new Error("Missing authToken!");
    }

    this.messageBody = config["messageBody"];
    if (!this.messageBody) {
        throw new Error("Missing messageBody!");
    }

    this.toNumbers = config["toNumbers"];
    if (!this.toNumbers) {
        throw new Error("Missing toNumbers!");
    }

    this.twilioNumber = config["twilioNumber"];
    if (!this.twilioNumber) {
        throw new Error("Missing twilioNumber!");
    }

    this.name = config["name"];
    if (!this.name) {
        throw new Error("Missing name!");
    }

    this.client = require("twilio")(this.accountSid, this.authToken);

    this.services = {
        AccessoryInformation: new Service.AccessoryInformation(),
        Switch: new Service.Switch(this.name)
    };

    this.services.AccessoryInformation
        .setCharacteristic(Characteristic.Manufacturer, "vectronic");
    this.services.AccessoryInformation
        .setCharacteristic(Characteristic.Model, "Send SMS Switch");

    this.services.Switch
        .setCharacteristic(Characteristic.On, false);
}


TwilioSwitch.prototype.sendSms = function (toNumber) {

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
                    body: self.messageBody + " (retry)"
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

        // Automatically switch off
        self.switchService.setCharacteristic(Characteristic.On, false);
    });
};


TwilioSwitch.prototype.setPowerState = function (powerOn, callback) {

    if (powerOn) {
        for (var i = 0; i < this.toNumbers.length; ++i) {
            this.sendSms(this.toNumbers[i]);
        }
    }
    callback();
};


TwilioSwitch.prototype.getServices = function () {
    return [this.services.AccessoryInformation, this.services.Switch];
};
