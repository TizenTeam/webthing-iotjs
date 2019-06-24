// -*- mode: js; js-indent-level:2;  -*-
// SPDX-License-Identifier: MPL-2.0

/**
 *
 * Copyright 2018-present Samsung Electronics France SAS, and other contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */
const console = require('console');

// Disable logs here by editing to '!console.log'
const log = console.log || function() {};
const verbose = !console.log || function() {};

const {
  Property,
  Value,
} = require('webthing');

const pwm = require('pwm');

class PwmOutProperty extends Property {
  constructor(thing, name, value, metadata, config) {
    if (typeof config === 'undefined') {
      config = {};
    }
    super(thing, name, new Value(Number(value)),
          {
            '@type': 'LevelProperty',
            title: (metadata && metadata.title) || `PWM: ${name} (dutyCycle)`,
            type: 'integer',
            minimum: config.minimum || 0,
            maximum: config.maximum || 100,
            readOnly: false,
            unit: 'percent',
            description:
            (metadata && metadata.description) ||
              (`PWM DutyCycle`),
          });
    const self = this;
    this.config = config;
    if (!this.config.pwm) {
      this.config.pwm = {
        chip: 0,
        pin: 0,
        dutyCycle: 0.5, // secs
        period: 1,
      };
    }
    if (typeof this.config.pwm.dutyCycle == 'undefined') {
      this.config.pwm.dutyCycle = 0.5;
    }
    verbose(`log: opening: ${this.description}`);
    this.port = pwm.export(
      this.config.pwm.chip, this.config.pwm.pin,
      (err) => {
        verbose(`log: PWM: ${self.getName()}: open: ${err}`);
        if (err) {
          console.error(`error: PWM: ${self.getName()}: open: ${err}`);
          throw err;
        }
        self.port.freq = 1 / self.config.pwm.period;
        // Linux sysfs uses usecs units
        self.port.setPeriod(
          self.config.pwm.period * 1000 * 1000,
          () => {
            self.port.setDutyCycle(
              self.config.pwm.dutyCycle / 100 * 1000 * 1000,
              () => {
                self.port.setEnable(1, () => {
                  verbose(`log: ${self.getName()}: Enabled`);
                });
              });
          });

        self.value.valueForwarder = function(value) {
          const usec = Math.floor((self.config.pwm.period * 1000 * 1000) *
                                (Number(value) / 100.0));

          self.port.setDutyCycle(usec, function() {
            verbose(`log: setDutyCycle: usec=${usec}`);
          });
        };
      });
  }

  close() {
    verbose(`log: PWM: ${this.getName()}: close:`);
    try {
      this.port && this.port.unexport();
    } catch (err) {
      console.error(`error: PWM: ${this.getName()} close:${err}`);
      return err;
    }
    log(`log: PWM: ${this.getName()}: close:`);
  }
}


module.exports = PwmOutProperty;


if (module.parent === null) {
  new PwmOutProperty;
  setInterval(function() {
    console.log(new Date());
  }, 10000);
}
