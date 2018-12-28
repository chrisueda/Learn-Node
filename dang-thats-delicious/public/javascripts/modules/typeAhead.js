import axios from 'axios';
import dompurify from 'dompurify';

function  searchResultsHTML(stores) {
  return stores.map(store => {
    return `
      <a href="/store/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
      </a>
    `;
  }).join('');
};

function typeAhead(search) {
  if (!search) {
    return;
  }

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function() {
    // if there's no value quit it.
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }

    searchResults.style.display = 'block';

    axios.get(`/api/search?q=${this.value}`)
    .then(res => {
      if(res.data.length) {
        searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
        return;
      }

      // tell them there are no results
      searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for "${this.value}" found!</div>`);

    })
    .catch(err => {
      console.error(err);
    })
  });

  // handle keyboard inputs
  searchInput.on('keyup', (e) => {
    // if they aren't pressing up, down or enter skip
    if (![38, 40, 13].includes(e.keyCode)) {
      return;
    }

    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    // if pressing down and there's a active current item
    if (e.keyCode === 40 && current) {
      // get next element or first one.
      next = current.nextElementSibling || item[0];
    } else if (e.keyCode === 40) { // nothing selected yet because no 'current'.
      next = items[0];
    } else if (e.keyCode === 38 && current) { // if you're pressing up
      // get the previous or the last one.
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 && current.href) { // If you hit enter
      window.location = current.href;
      return;
    }
    if (current) {
      current.classList.remove(activeClass);
    }
    next.classList.add(activeClass);
  })

};

export default typeAhead;
