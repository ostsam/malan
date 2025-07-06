declare module "opencc-js" {
  interface ConverterOptions {
    from: string;
    to: string;
  }

  interface Converter {
    (text: string): string;
  }

  function Converter(options: ConverterOptions): Converter;

  export { Converter };
}
