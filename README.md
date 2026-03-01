# homebridge-twilio-sms

Homebridge plugin to send SMSes with static text.
This plugin uses Twilio api, which is a paid service at a fair price - [www.Twilio.com](https://www.twilio.com).

Very good use for homekit alarms and sensor, you can set an automation to SMS your phone if your alarm is triggered, there is a water leak or smoke detected.

# Twilio configurations
To use this plugin, you need to signup to their website and get a phone number from their service it will use you in the config as **twilioNumber**.

the **accountSid** and **authToken** can be retrieved from [https://www.twilio.com/console/account/settings](https://www.twilio.com/console/account/settings)

After you set all of those, you can move forward to installing the plugin on homebridge.

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g @vectronic/homebridge-twilio-sms`
3. Configure via the Homebridge UI or update your `config.json` manually

# Configuration

Twilio credentials are configured at the platform level. Each accessory defines its own message and recipient phone numbers, allowing you to create multiple SMS switches for different alerts.

Example `config.json` entry:

 ```json
"platforms": [
  {
    "platform": "TwilioSMS",
    "name": "Twilio SMS",
    "accountSid": "4352435f45f423456d652643dxre",
    "authToken": "RVGH54CG45G5TG354GRT45T45G4G",
    "twilioNumber": "+445287562349",
    "accessories": [
      {
        "name": "Power Lost",
        "messageBody": "Power loss detected",
        "toNumbers": ["+445287563029", "+445287563483"]
      },
      {
        "name": "Water Leak",
        "messageBody": "Water leak detected!",
        "toNumbers": ["+445287563029"]
      }
    ]
  }
]
```
