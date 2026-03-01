import type { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig } from 'homebridge';

import { TwilioSmsAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

export class TwilioSmsPlatform implements DynamicPlatformPlugin {

  private readonly accessories: Map<string, PlatformAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverDevices(): void {
    const name = this.config.name || 'Twilio SMS';
    const uuid = this.api.hap.uuid.generate(PLUGIN_NAME + '.' + name);

    const existingAccessory = this.accessories.get(uuid);

    if (existingAccessory) {
      this.log.info('Restoring existing accessory:', existingAccessory.displayName);
      new TwilioSmsAccessory(this, existingAccessory);
    } else {
      this.log.info('Adding new accessory:', name);
      const accessory = new this.api.platformAccessory(name, uuid);
      new TwilioSmsAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    // Remove stale accessories
    for (const [uuid, accessory] of this.accessories) {
      if (uuid !== this.api.hap.uuid.generate(PLUGIN_NAME + '.' + name)) {
        this.log.info('Removing stale accessory:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(uuid);
      }
    }
  }
}
