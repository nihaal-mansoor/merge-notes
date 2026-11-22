/*
  The contact form. The only script on the site.

  With JavaScript: checks the fields, sends the message to Formspree without
  leaving the page, and shows "Thanks" or an error under the button.
  Without JavaScript: the form posts to Formspree normally and still works.
*/
(function () {
  var form = document.getElementById('contact-form');
  if (!form || !window.fetch || !window.FormData) return;

  var status = document.getElementById('form-status');
  var button = form.querySelector('button[type="submit"]');
  var buttonText = button.textContent;

  function show(kind, text) {
    status.className = 'form-status' + (kind ? ' ' + kind : '');
    status.textContent = text;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (form.action.indexOf('YOUR-FORM-ID') !== -1) {
      show('error', "This form isn't connected yet. Please message me on LinkedIn instead.");
      return;
    }

    button.disabled = true;
    button.textContent = 'Sending...';
    show('sending', 'Sending your message...');

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Status ' + response.status);
        form.reset();
        show('ok', "Thanks, your message was sent. I'll reply soon.");
      })
      .catch(function () {
        show('error', "Sorry, that didn't send. Please try again in a minute, or message me on LinkedIn.");
      })
      .then(function () {
        button.disabled = false;
        button.textContent = buttonText;
      });
  });
})();
