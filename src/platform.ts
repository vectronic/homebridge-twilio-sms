import type { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig } from 'homebridge';

import Twilio from 'twilio';

import { TwilioSmsAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

export class TwilioSmsPlatform implements DynamicPlatformPlugin {

  private readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly twilioClient: ReturnType<typeof Twilio>;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    if (!config.accountSid || !config.authToken || !config.twilioNumber) {
      this.log.error('Missing required Twilio credentials. Check accountSid, authToken, twilioNumber.');
      throw new Error('Missing required Twilio credentials');
    }

    this.twilioClient = Twilio(config.accountSid as string, config.authToken as string);

    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverDevices(): void {
    const accessoryConfigs = this.config.accessories as Array<{ name: string; messageBody: string; toNumbers: string[] }> || [];

    if (accessoryConfigs.length === 0) {
      this.log.warn('No accessories configured.');
    }

    const expectedUUIDs = new Set<string>();

    for (const accessoryConfig of accessoryConfigs) {
      if (!accessoryConfig.name || !accessoryConfig.messageBody || !accessoryConfig.toNumbers) {
        this.log.warn('Skipping accessory with missing name, messageBody, or toNumbers.');
        continue;
      }

      const uuid = this.api.hap.uuid.generate(PLUGIN_NAME + '.' + accessoryConfig.name);
      expectedUUIDs.add(uuid);

      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory:', existingAccessory.displayName);
        existingAccessory.context = accessoryConfig;
        new TwilioSmsAccessory(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', accessoryConfig.name);
        const accessory = new this.api.platformAccessory(accessoryConfig.name, uuid);
        accessory.context = accessoryConfig;
        new TwilioSmsAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // Remove stale accessories
    for (const [uuid, accessory] of this.accessories) {
      if (!expectedUUIDs.has(uuid)) {
        this.log.info('Removing stale accessory:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(uuid);
      }
    }
  }
}
