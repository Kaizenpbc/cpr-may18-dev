// Type declarations for stylis and stylis-plugin-rtl
// These modules are used for RTL (right-to-left) language support

declare module 'stylis' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const prefixer: any;
}

declare module 'stylis-plugin-rtl' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rtlPlugin: any;
  export default rtlPlugin;
}
