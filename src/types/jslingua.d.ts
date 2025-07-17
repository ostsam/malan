declare module "jslingua" {
  interface JsLinguaService {
    gwords: (text: string) => string[];
  }

  interface JsLingua {
    gserv: (service: string, lang?: string) => JsLinguaService | string[];
  }

  const jslingua: JsLingua;
  export default jslingua;
}
