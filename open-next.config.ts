// OpenNext Cloudflare adapter config.
// https://opennext.js.org/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Incremental cache can be wired to Cloudflare KV/R2 later; the defaults are
  // fine for the initial hosting spike.
});
