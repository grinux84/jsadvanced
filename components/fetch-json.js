// same as fetch, but throws FetchError in case of errors
// status >= 400 is an error
// network error / json error are errors

export default async function(url, params) {
  let response;

  const fetchObserver = new FetchObserver();
  fetchObserver.fetchStart(); 

  try {
    // TODO: "toString" call needed for correct work of "jest-fetch-mock"
    response = await fetch(url.toString(), params);
  } catch (err) {
    fetchObserver.fetchEnd(); 
    throw new FetchError(response, null, "Network error has occurred.");
  }

  let body;

  if (!response.ok) {
    let errorText = response.statusText; // Not Found (for 404)

    try {
      body = await response.json();

      errorText = (body.error && body.error.message) || (body.data && body.data.error && body.data.error.message) || errorText;
    } catch (error) { /* ignore failed body */ }

    fetchObserver.fetchEnd(); 

    let message = `Error ${response.status}: ${errorText}`;

    throw new FetchError(response, body, message);
  }

  try {
    return await response.json();
  } catch (err) {
    throw new FetchError(response, null, err.message);
  } finally {
    fetchObserver.fetchEnd(); 
  }
}

export class FetchError extends Error {
  name = "FetchError";

  constructor(response, body, message) {
    super(message);
    this.response = response;
    this.body = body;

    document.dispatchEvent(new CustomEvent('fetch-error', {
      bubbles: true,
      detail: message
    }));

  }
}

// handle uncaught failed fetch through
window.addEventListener('unhandledrejection', event => {
  if (event.reason instanceof FetchError) {
    document.dispatchEvent(new CustomEvent('fetch-error', {
      bubbles: true,
      detail: event.reason.message
    }));

    alert(event.reason.message);
  }
});

class FetchObserver {
  static #instance = null;
  counter = 0;

  constructor() {
    if (!FetchObserver.#instance) 
    FetchObserver.#instance = this;
    else 
      return FetchObserver.#instance; 
  }

  fetchStart() {
    if (!this.counter)
      document.dispatchEvent(new CustomEvent('fetch-active', {
        bubbles: true
      }));
    this.counter++;
  }

  fetchEnd() {
    if (!this.counter)
      throw new Error('FetchObserver counter mismatch');
    this.counter--;
    if (!this.counter)
      document.dispatchEvent(new CustomEvent('fetch-completed', {
        bubbles: true
      }));
  }
}

