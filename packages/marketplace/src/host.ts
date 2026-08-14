/**
 * dsh-host-marketplace entry: registers the marketplace gateway as a Cordis
 * plugin row. One row (`name: '@dsh-marketplace/marketplace'`) activates both
 * the Host service and, via exports["./client"], the browser marketplace tab.
 */
import { MarketplaceGateway, type MarketplaceConfig } from "./gateway";

export const name = "marketplace";
export const inject = ["typert"] as string[];

export function apply(ctx: any, config: MarketplaceConfig = {}) {
  ctx.logger.info("[marketplace] apply: registering gateway");
  ctx.plugin(MarketplaceGateway, config);
  // Diagnostic: confirm the typert-loader registered our host manifest.
  // Runs after plugin registration so the loader's mount tracking has settled.
  setTimeout(() => {
    try {
      const found = ctx.typert?.getPackage?.("@dsh-marketplace/marketplace", "host");
      ctx.logger.info("[marketplace] typert registry: " + (found ? "REGISTERED (" + (Array.isArray(found.services) ? found.services.length + " services" : "object") + ")" : "NOT FOUND"));
    } catch (e) {
      ctx.logger.warn("[marketplace] typert check failed: " + String(e));
    }
  }, 2000);
}
