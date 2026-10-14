// Grammar colours on sentences are on by default; turning them off adds
// .roles-off to <html> (globals.css) and remembers it in this browser.

export const ROLE_COLOURS_KEY = "grammar-colours";

/** Inline script for <head>: applies the saved choice before first paint. */
export const ROLE_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(ROLE_COLOURS_KEY)})==='"off"')document.documentElement.classList.add("roles-off")}catch(e){}`;
