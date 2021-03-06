/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @fileOverview Implements provider specific content scripts to query
 * recipients and set sender email addresses in the webmail ui.
 */

'use strict';

var mvelo = mvelo || {};

mvelo.providers = {};

/**
 * Initializes the map of provider specific modules.
 */
mvelo.providers.init = function() {
  mvelo.providers.map = new Map();
  mvelo.providers.map.set('mail.google.com', new mvelo.providers.Gmail());
  mvelo.providers.map.set('mail.yahoo.com', new mvelo.providers.Yahoo());
  mvelo.providers.map.set('default', new mvelo.providers.Default());
};

/**
 * Lookup function that return the vendor specific module to a hostname.
 * If a hostname if not supported specifically, the default module will
 * be returned.
 * @param  {String} hostname   The hostname of the webmail interface
 * @return {Object}            An instanciated module
 */
mvelo.providers.get = function(hostname) {
  if (mvelo.providers.map.has(hostname)) {
    return mvelo.providers.map.get(hostname);
  } else {
    return mvelo.providers.map.get('default');
  }
};


//
// Provider specific modules
//


(function(mvelo) {

  mvelo.providers.Gmail = Gmail;
  mvelo.providers.Yahoo = Yahoo;
  mvelo.providers.Default = Default;


  //
  // Default module ... generic handling for unsupported providers
  //


  function Default() {}

  /**
   * Parse recipients from the DOM has not been reliable for generic webmail
   */
  Default.prototype.getRecipients = function() { /* do nothing */ };

  /**
   * Since there is not way to enter recipients in a generic fashion
   * this function does nothing.
   */
  Default.prototype.setRecipients = function() { /* do nothing */ };


  //
  // Gmail module
  //


  function Gmail() {}

  /**
   * Parse recipients from the Gmail Webmail interface
   * @return {Array}   The recipient objects in the form { email: 'jon@example.com' }
   */
  Gmail.prototype.getRecipients = function() {
    return dom.getAttr($('.oL.aDm span[email], .vR span[email]'), 'email');
  };

  /**
   * Set the recipients in the Gmail Webmail editor.
   */
  Gmail.prototype.setRecipients = function(recipients) {
    recipients = recipients || [];
    // find the relevant elements in the Gmail interface
    var displayArea = $('.aoD.hl'); // email display only area
    var tagRemove = $('.fX .vR .vM'); // email tags remove button
    var input = $('.fX .vO'); // the actual recipient email address text input (a textarea)
    var subject = $('.aoT'); // subject field
    var editor = $('.aO7 .Am'); // editor
    input.val('');
    dom.setFocus(displayArea)
    .then(function() {
      tagRemove.click();
      // enter address text into input
      var text = joinEmail(recipients);
      input.first().val(text);
    })
    .then(function() {
      dom.setFocus(subject.is(':visible') ? subject : editor);
    });
  };

  //
  // Yahoo module
  //

  function Yahoo() {}

  /**
   * Parse recipients from the Yahoo Webmail interface
   * @return {Array}   The recipient objects in the form { email: 'jon@example.com' }
   */
  Yahoo.prototype.getRecipients = function() {
    return dom.getAttr($('.compose-header span[data-address]'), 'data-address');
  };

  /**
   * Set the recipients in the Yahoo Webmail editor.
   */
  Yahoo.prototype.setRecipients = function(recipients) {
    recipients = recipients || [];
    // remove existing recipients
    $('.compose-header li.hLozenge').remove();
    // enter address text into input
    var text = joinEmail(recipients);
    var input = $('.compose-header #to .recipient-input input');
    input.val(text);
    // trigger change event by switching focus
    dom.setFocus(input)
    .then(function() {
      // set focus to subject field, or to compose area in the reply case
      dom.setFocus($('#subject-field').is(':visible') ? $('#subject-field') : $('.compose-message .cm-rtetext'));
    });
  };

  //
  // DOM api util
  //

  var EMAILS_REGEX = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;

  var dom = {};

  /**
   * Filter the value of a list of elements for email addresses.
   * @param  {[type]} elements   A list of jQuery elements to iteralte over
   * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
   */
  dom.getVal = function(elements) {
    var recipients = [];
    elements.each(function() {
      recipients = recipients.concat(parse($(this).val()));
    });
    return recipients;
  };

  /**
   * Filter the text content of a list of elements for email addresses.
   * @param  {[type]} elements   A list of jQuery elements to iteralte over
   * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
   */
  dom.getText = function(elements) {
    var recipients = [];
    elements.each(function() {
      if (!$(this).text().match(EMAILS_REGEX)) {
        return;
      }
      // second filtering: only direct text nodes of span elements
      var spanClone = $(this).clone();
      spanClone.children().remove();
      recipients = recipients.concat(parse(spanClone.text()));
    });
    return recipients;
  };

  /**
   * Filter a certain attribute of a list of elements for email addresses.
   * @param  {[type]} elements   A list of jQuery elements to iteralte over
   * @param  {[type]} attrName   The element's attribute name to query by
   * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
   */
  dom.getAttr = function(elements, attrName) {
    var recipients = [];
    elements.each(function() {
      recipients = recipients.concat(parse($(this).attr(attrName)));
    });
    return recipients;
  };

  /**
   * Set focus to element on next tick
   * @param  {jQuery} element jQuery element to set focus
   */
  dom.setFocus = function(element) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        element.focus();
        resolve();
      }, 0);
    });
  };

  /**
   * Parse email addresses from string input.
   * @param  {String} text   The input to be matched
   * @return {Array}         The recipient objects in fhe form { email: 'jon@example.com' }
   */
  function parse(text) {
    if (!text) {
      return [];
    }
    var valid = text.match(EMAILS_REGEX);
    if (valid === null) {
      return [];
    }
    return toRecipients(valid);
  }

  /**
   * Maps an array of email addresses to an array of recipient objects.
   * @param  {Array} addresses   An array of email addresses
   * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
   */
  function toRecipients(addresses) {
    return addresses.map(function(address) {
      return {
        email: address
      };
    });
  }

  /**
   * Maps an array of recipients to a string of email addresses
   * @param  {Array} recipients The recipient objects in the form { email: 'jon@example.com' }
   * @return {String}           comma separated list of email addresses
   */
  function joinEmail(recipients) {
    return recipients.map(function(r) { return r.email; }).join(', ');
  }

}(mvelo));
