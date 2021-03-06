/* global mvelo */

'use strict';

describe('Provider specific content-script unit tests', function() {
  var testElem;

  beforeEach(function() {
    testElem = $('<div id="testElem"></div>');
    $(document.body).append(testElem);
  });

  afterEach(function() {
    testElem.remove();
  });

  describe('providers.init', function() {
    it('should work', function() {
      mvelo.providers.init();
      expect(mvelo.providers.map).to.exist;
    });
  });

  describe('providers.get', function() {
    beforeEach(function() {
      mvelo.providers.init();
    });

    it('should return default module for generic case', function() {
      var api = mvelo.providers.get('mail.some-generic-provider.com');
      expect(api instanceof mvelo.providers.Default).to.be.true;
    });

    it('should return Gmail module', function() {
      var api = mvelo.providers.get('mail.google.com');
      expect(api instanceof mvelo.providers.Gmail).to.be.true;
    });
  });

  describe('Default module', function() {
    var defMod;

    beforeEach(function() {
      mvelo.providers.init();
      defMod = mvelo.providers.get('mail.some-generic-provider.com');
    });

    describe('getRecipients', function() {
      it('should work', function() {
        defMod.getRecipients();
      });
    });

    describe('setRecipients', function() {
      it('should work', function() {
        defMod.setRecipients();
      });
    });
  });

  describe('Gmail module', function() {
    var gmail;

    beforeEach(function() {
      mvelo.providers.init();
      gmail = mvelo.providers.get('mail.google.com');
    });

    describe('getRecipients', function() {
      it('should work', function() {
        testElem.append('<div class="vR"><span email="test1@example.com"><div class="vT">Test User</div></span></div>');
        testElem.append('<div class="oL aDm"><span email="test2@example.com"><div class="vT">Test User</div></span></div>');

        var recipients = gmail.getRecipients();

        expect(recipients.length).to.equal(2);
        expect(recipients[0].email).to.equal('test1@example.com');
        expect(recipients[1].email).to.equal('test2@example.com');
      });
    });

    describe('setRecipients', function() {
      beforeEach(function() {
        testElem.append('<div class="aoD hl"></div>');
        testElem.append('<div class="fX"><div class="vR"><span class="vM"></span></div><textarea class="vO"></textarea></div>');
      });

      it('should clear email address text input', function() {
        var toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        $('.fX .vO').val('test1@example.com');

        gmail.setRecipients(toSet);

        expect($('.fX .vO').val()).to.be.empty;
      });

      it('should trigger click event on email remove buttons', function(done) {
        var toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        $('.fX .vR .vM').on('click', function() {
          done();
        });

        gmail.setRecipients(toSet);
      });

      it('should set joined email addresses to input field', function(done) {
        var toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        gmail.setRecipients(toSet);

        setTimeout(function() {
          expect($('.fX .vO').val()).to.equal('test1@example.com, test2@example.com');
          done();
        }, 10);
      });

      it('should work for undefined', function() {
        gmail.setRecipients(undefined);
        var recipients = gmail.getRecipients();

        expect(recipients.length).to.equal(0);
      });

      it('should not inject script', function() {
        var toSet = [{email: '<script>alert("xss")</script>'}];

        gmail.setRecipients(toSet);
        var recipients = gmail.getRecipients();

        expect(recipients.length).to.equal(0);
      });
    });
  });

});
