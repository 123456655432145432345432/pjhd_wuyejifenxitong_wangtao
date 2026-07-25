/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROPERTY_COMPANY_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.jpg' {
  const src: string
  export default src
}
