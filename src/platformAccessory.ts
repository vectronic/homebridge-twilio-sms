import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { TwilioSmsPlatform } from './platform.js';

export class TwilioSmsAccessory {

  private readonly service: Service;

  constructor(
    private readonly platform: TwilioSmsPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const context = this.accessory.context as { name: string; messageBody: string; toNumbers: string[] };

    this.accessory.getService(this.platform.api.hap.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, 'vectronic')
      .setCharacteristic(this.platform.api.hap.Characteristic.Model, 'Twilio SMS Switch')
      .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.api.hap.Service.Switch)
      || this.accessory.addService(this.platform.api.hap.Service.Switch);

    this.service.setCharacteristic(this.platform.api.hap.Characteristic.Name, context.name);

    this.service.getCharacteristic(this.platform.api.hap.Characteristic.On)
      .onGet(() => false)
      .onSet(this.setOn.bind(this));
  }

  private async sendSms(toNumber: string, retry = false): Promise<void> {
    const context = this.accessory.context as { name: string; messageBody: string; toNumbers: string[] };
    const body = retry ? `${context.messageBody} (retry)` : context.messageBody;

    try {
      await this.platform.twilioClient.messages.create({
        to: toNumber,
        from: this.platform.config.twilioNumber as string,
        body,
      });
      this.platform.log.info('SMS success: %s -> %s', toNumber, context.messageBody);
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
      const context = this.accessory.context as { name: string; messageBody: string; toNumbers: string[] };
      for (const number of context.toNumbers) {
        this.sendSms(number);
      }

      // Automatically switch off
      setTimeout(() => {
        this.service.updateCharacteristic(this.platform.api.hap.Characteristic.On, false);
      }, 1000);
    }
  }
}
