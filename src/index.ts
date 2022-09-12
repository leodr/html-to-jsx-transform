import { htmlToJsx } from "./html-to-jsx";

export { htmlToJsx } from "./html-to-jsx";

htmlToJsx(`<h1 style="padding: 10px; background-color: red;">
    Hello World!
  </h1>`).then(console.log);
