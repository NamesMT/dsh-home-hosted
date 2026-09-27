/**
 * `react-dom` ships no bundled types and this repo does not install
 * `@types/react-dom`, so the one server-render entry the client tests use is
 * declared here. Nothing the shipped client imports comes through this module.
 */
declare module 'react-dom/server' {
  export function renderToStaticMarkup(node: unknown): string
}
