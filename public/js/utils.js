
const urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
const hashtagRegex = /(^|\s)(#[a-z\d-]+)/ig;

function highlightURL(text) {
  return text.replace(urlRegex, '<em class="url">$&</em>');
}

function highlightHashtag(text) {
  return text.replace(hashtagRegex, '<em class="hashtag">$&</em>');
}

function checkForNotice() {
  const notice = getCookie('_JourneyManager_notice');
  if (isDefined(notice) && notice.length > 0) displayNotice(notice);
}

function getCookie(cname) {
  const name = cname + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');

  for (const element of ca) {
    let c = element.trim();
    if (c.startsWith(name)) return c.substring(name.length);
  }
  
  return "";
}

function setNoticeBehavior() {
  const elements = document.querySelectorAll('[data-behavior~="display-notice"]');
  elements.forEach(element => {
    element.addEventListener('click', event => {
      const text = event.target.dataset.text;
      displayNotice(text);
    });
  });
}

function setDeleteBehavior() {
  const elements = document.querySelectorAll('[data-behavior~="delete"]');
  elements.forEach(element =>
    element.addEventListener('click', event => {
      const target = event.target;
      const action = target.dataset.action;
      const message = target.dataset.message;

      displayConfirm(message, () => {
        axios.post(action)
          .then(response => console.log(response))
          .catch(error => console.log(error));
      });
    }, false)
  );
}

function setConfirmBehavior() {
  const elements = document.querySelectorAll('[data-behavior~="display-confirm"]');
  elements.forEach(element => {
    element.addEventListener('click', event => {
      const target = event.target;
      const text = target.dataset.text;
      const form = target.dataset.target;

      displayConfirm(text, () => {
        document.querySelector(`[data-id~='${form}']`).submit();
      });
    });
  });
}

function displayNotice(text) {
  const modal = document.querySelector('div[data-behavior~="notice-modal"]');
  modal.querySelector('.modal-body').innerHTML = text;
  $(modal).modal('show');
}

function displayConfirm(text, callback) {
  const modal = document.querySelector('div[data-behavior~="confirm-modal"]');
  modal.querySelector('.modal-body').innerHTML = text;
  $(modal).modal('show');

  const confirmAction = modal.querySelector('button[data-behavior~="confirmed"]');
  confirmAction.addEventListener('click', event => callback(event.target));
}

function displayLoading(show) {
  const screen = document.querySelector('div[data-behavior="loading-screen"]');
  screen.classList.toggle('d-none', !show);
}

function isDefined(value) {
  return (value !== undefined && value !== null);
}
