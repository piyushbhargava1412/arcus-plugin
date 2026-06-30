// Dev-only loader: re-exports the real arcus-opencode plugin from the in-repo
// package so this repo can test the actual distribution code (import.meta.dir
// resolution + bundled/ staging) WITHOUT publishing or npm-linking.
//
// In a real target repo you do NOT use this file — you install the package and
// add  { "plugin": ["arcus-opencode"] }  to opencode.json instead.
export { ArcusOpencode } from "../../plugins/arcus-opencode/src/index.ts"
