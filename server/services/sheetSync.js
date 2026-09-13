// Supabase is the source of truth. These named methods preserve the integration
// boundary so a sheet exporter can be reintroduced without coupling routes to it.
export const sheetSync = {
  user() {},
  application() {},
  payment() {},
  audit() {},
}
