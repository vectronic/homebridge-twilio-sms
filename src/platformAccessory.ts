import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import Twilio from 'twilio';

import type { TwilioSmsPlatform } from './platform.js';

export class TwilioSmsAccessory {

  private readonly service: Service;
  private readonly client: ReturnType<typeof Twilio>;

  constructor(
    private readonly platform: TwilioSmsPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const config = this.platform.config;

    if (!config.accountSid || !config.authToken || !config.messageBody || !config.toNumbers || !config.twilioNumber) {
      this.platform.log.error('Missing required Twilio configuration. Check accountSid, authToken, messageBody, toNumbers, twilioNumber.');
      throw new Error('Missing required Twilio configuration');
    }

    this.client = Twilio(config.accountSid as string, config.authToken as string);

    this.accessory.getService(this.platform.api.hap.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, 'vectronic')
      .setCharacteristic(this.platform.api.hap.Characteristic.Model, 'Twilio SMS Switch')
      .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.api.hap.Service.Switch)
      || this.accessory.addService(this.platform.api.hap.Service.Switch);

    this.service.setCharacteristic(this.platform.api.hap.Characteristic.Name, config.name || 'Twilio SMS');

    this.service.getCharacteristic(this.platform.api.hap.Characteristic.On)
      .onGet(() => false)
      .onSet(this.setOn.bind(this));
  }

  private async sendSms(toNumber: string, retry = false): Promise<void> {
    const config = this.platform.config;
    const body = retry ? `${config.messageBody} (retry)` : config.messageBody as string;

    try {
      await this.client.messages.create({
        to: toNumber,
        from: config.twilioNumber as string,
        body,
      });
      this.platform.log.info('SMS success: %s -> %s', toNumber, config.messageBody);
    } catch (error) {
      if (!retry) {
        this.platform.log.error('SMS error (will retry):', error);
        await new Promise(resolve => setTimeout(resolve, 30000));
        await this.sendSms(toNumber, true);
      } else {
        this.platform.log.error('SMS error (giving up):', error);
      }
    }
  }

  private async setOn(value: CharacteristicValue): Promise<void> {
    if (value) {
      const toNumbers = this.platform.config.toNumbers as string[];
      for (const number of toNumbers) {
        this.sendSms(number);
      }

      // Automatically switch off
      setTimeout(() => {
        this.service.updateCharacteristic(this.platform.api.hap.Characteristic.On, false);
      }, 1000);
    }
  }
}
